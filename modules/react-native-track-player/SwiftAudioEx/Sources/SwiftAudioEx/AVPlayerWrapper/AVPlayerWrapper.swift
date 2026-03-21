//
//  AVPlayerWrapper.swift
//  SwiftAudio
//
//  Created by Jørgen Henrichsen on 06/03/2018.
//  Copyright © 2018 Jørgen Henrichsen. All rights reserved.
//

import Foundation
import AVFoundation
import MediaPlayer

public enum PlaybackEndedReason: String {
    case playedUntilEnd
    case playerStopped
    case skippedToNext
    case skippedToPrevious
    case jumpedToIndex
    case cleared
    case failed
}

class AVPlayerWrapper: AVPlayerWrapperProtocol {
    // MARK: - Properties
    
    fileprivate var avPlayer = AVPlayer()
    private let playerObserver = AVPlayerObserver()
    internal let playerTimeObserver: AVPlayerTimeObserver
    private let playerItemNotificationObserver = AVPlayerItemNotificationObserver()
    private let playerItemObserver = AVPlayerItemObserver()
    fileprivate var timeToSeekToAfterLoading: TimeInterval?

    /// Last known-good playback position, updated every time the
    /// periodic time observer fires or a seek completes.  Used to
    /// preserve position across reload/recreate cycles.
    fileprivate(set) var lastPosition: TimeInterval = 0

    fileprivate var asset: AVAsset? = nil
    fileprivate var item: AVPlayerItem? = nil
    fileprivate var url: URL? = nil
    fileprivate var urlOptions: [String: Any]? = nil
    fileprivate let stateQueue = DispatchQueue(
        label: "AVPlayerWrapper.stateQueue",
        attributes: .concurrent
    )

    public init() {
        playerTimeObserver = AVPlayerTimeObserver(periodicObserverTimeInterval: timeEventFrequency.getTime())

        playerObserver.delegate = self
        playerTimeObserver.delegate = self
        playerItemNotificationObserver.delegate = self
        playerItemObserver.delegate = self

        setupAVPlayer();
    }
    
    // MARK: - AVPlayerWrapperProtocol

    fileprivate(set) var playbackError: AudioPlayerError.PlaybackError? = nil
    
    var _state: AVPlayerWrapperState = AVPlayerWrapperState.idle
    var state: AVPlayerWrapperState {
        get {
            var state: AVPlayerWrapperState!
            stateQueue.sync {
                state = _state
            }

            return state
        }
        set {
            stateQueue.async(flags: .barrier) { [weak self] in
                guard let self = self else { return }
                let currentState = self._state
                if (currentState != newValue) {
                    self._state = newValue
                    // Dispatch to main thread: the delegate accesses AVPlayer
                    // properties (currentTime, duration, currentItem) which are
                    // only safe on the main thread.  Without this, the stateQueue
                    // callback races with main-thread AVPlayer mutations during
                    // watchdog reloads, causing EXC_BAD_ACCESS.
                    DispatchQueue.main.async { [weak self] in
                        guard let self = self else { return }
                        self.delegate?.AVWrapper(didChangeState: newValue)
                    }
                }
            }
        }
    }

    fileprivate(set) var lastPlayerTimeControlStatus: AVPlayer.TimeControlStatus = AVPlayer.TimeControlStatus.paused

    /**
     Whether AVPlayer should start playing automatically when the item is ready.
     */
    public var playWhenReady: Bool = false {
        didSet {
            if (playWhenReady == true && (state == .failed || state == .stopped)) {
                reload(startFromCurrentTime: true)
            }

            applyAVPlayerRate()
            
            if oldValue != playWhenReady {
                delegate?.AVWrapper(didChangePlayWhenReady: playWhenReady)
            }
        }
    }
    
    var currentItem: AVPlayerItem? {
        avPlayer.currentItem
    }

    var playbackActive: Bool {
        switch state {
        case .idle, .stopped, .ended, .failed:
            return false
        default: return true
        }
    }
    
    var currentTime: TimeInterval {
        let seconds = avPlayer.currentTime().seconds
        return seconds.isNaN ? lastPosition : seconds
    }
    
    var duration: TimeInterval {
        if let seconds = currentItem?.asset.duration.seconds, !seconds.isNaN {
            return seconds
        }
        else if let seconds = currentItem?.duration.seconds, !seconds.isNaN {
            return seconds
        }
        else if let seconds = currentItem?.seekableTimeRanges.last?.timeRangeValue.duration.seconds,
                !seconds.isNaN {
            return seconds
        }
        return 0.0
    }
    
    var bufferedPosition: TimeInterval {
        currentItem?.loadedTimeRanges.last?.timeRangeValue.end.seconds ?? 0
    }

    var reasonForWaitingToPlay: AVPlayer.WaitingReason? {
        avPlayer.reasonForWaitingToPlay
    }

    private var _rate: Float = 1.0;
    var rate: Float {
        get { _rate }
        set {
            _rate = newValue
            applyAVPlayerRate()
        }
    }

    weak var delegate: AVPlayerWrapperDelegate? = nil
    
    var bufferDuration: TimeInterval = 0

    var timeEventFrequency: TimeEventFrequency = .everySecond {
        didSet {
            playerTimeObserver.periodicObserverTimeInterval = timeEventFrequency.getTime()
        }
    }
    
    var volume: Float {
        get { avPlayer.volume }
        set { avPlayer.volume = newValue }
    }
    
    var isMuted: Bool {
        get { avPlayer.isMuted }
        set { avPlayer.isMuted = newValue }
    }

    var automaticallyWaitsToMinimizeStalling: Bool {
        get { avPlayer.automaticallyWaitsToMinimizeStalling }
        set { avPlayer.automaticallyWaitsToMinimizeStalling = newValue }
    }

    var isUrgentLoad: Bool = false

    // MARK: - Buffer Stall Watchdog
    //
    // Detects and recovers from stalled buffering after a long pause.
    //
    // Progressive HTTP streams (used by Subsonic) have no built-in retry
    // mechanism in AVPlayer.  Once the TCP connection dies (e.g. after the
    // app is paused/backgrounded for several minutes), AVPlayer sits in
    // .waitingToPlayAtSpecifiedRate forever — no error, no timeout.
    //
    // Additionally, a known Apple bug (rdar://25953728, rdar://29362808)
    // causes AVPlayer to silently stop producing audio after being paused
    // for ~2+ minutes on a stream.  The player reports no error: rate stays
    // at 1.0, status stays .readyToPlay, but no sound comes out.  The
    // hallmark of this bug is the contradictory state where
    // reasonForWaitingToPlay == .toMinimizeStalls while
    // isPlaybackBufferFull == true.
    //
    // The watchdog starts when the player enters buffering state with
    // playWhenReady == true.  After `bufferStallTimeout` seconds, it checks
    // whether the buffer position has advanced.  If not (dead connection)
    // or if the silent failure bug is detected, it triggers
    // reload(startFromCurrentTime:) to establish a fresh connection.

    private var bufferWatchdog: DispatchWorkItem?
    private var watchdogBufferPosition: TimeInterval = 0
    private var bufferReloadAttempts: Int = 0
    private let bufferStallTimeout: TimeInterval = 15.0
    private let maxBufferReloadAttempts: Int = 3

    func play() {
        playWhenReady = true
    }
    
    func pause() {
        playWhenReady = false
    }
    
    func togglePlaying() {
        switch avPlayer.timeControlStatus {
        case .playing, .waitingToPlayAtSpecifiedRate:
            pause()
        case .paused:
            play()
        @unknown default:
            fatalError("Unknown AVPlayer.timeControlStatus")
        }
    }
    
    func stop() {
        stopBufferWatchdog()
        state = .stopped
        clearCurrentItem()
        playWhenReady = false
    }
    
    func seek(to seconds: TimeInterval) {
       // if the player is loading then we need to defer seeking until it's ready.
        if (avPlayer.currentItem == nil) {
         timeToSeekToAfterLoading = seconds
         lastPosition = seconds
       } else {
           let time = CMTimeMakeWithSeconds(seconds, preferredTimescale: 1000)
           avPlayer.seek(to: time, toleranceBefore: CMTime.zero, toleranceAfter: CMTime.zero) { (finished) in
             self.lastPosition = seconds
             self.delegate?.AVWrapper(seekTo: Double(seconds), didFinish: finished)
         }
       }
     }

    func seek(by seconds: TimeInterval) {
        if let currentItem = avPlayer.currentItem {
            let time = currentItem.currentTime().seconds + seconds
            avPlayer.seek(
                to: CMTimeMakeWithSeconds(time, preferredTimescale: 1000)
            ) { (finished) in
                  self.delegate?.AVWrapper(seekTo: Double(time), didFinish: finished)
            }
        } else {
            if let timeToSeekToAfterLoading = timeToSeekToAfterLoading {
                self.timeToSeekToAfterLoading = timeToSeekToAfterLoading + seconds
            } else {
                timeToSeekToAfterLoading = seconds
            }
        }
    }
    
    private func playbackFailed(error: AudioPlayerError.PlaybackError) {
        state = .failed
        self.playbackError = error
        self.delegate?.AVWrapper(failedWithError: error)
    }
    
    func load() {
        // Capture and clear the urgent flag immediately so it doesn't
        // leak into subsequent loads.
        let urgent = isUrgentLoad
        isUrgentLoad = false

        // Stop any running watchdog — it will restart if the new load
        // enters buffering.  Don't reset bufferReloadAttempts here
        // because reload() calls load() and must preserve the counter.
        // The counter is reset in load(from:) (new track) and when
        // playback reaches .playing state.
        stopBufferWatchdog()

        if (state == .failed) {
            recreateAVPlayer()
        } else {
            // Stop the player-level observer before clearing to prevent
            // re-entrant KVO (.paused → .idle) during item replacement.
            // recreateAVPlayer() already does this; match that behavior here.
            playerObserver.stopObserving()
            clearCurrentItem()
            playerObserver.startObserving()
        }
        if let url = url {
            let pendingAsset = AVURLAsset(url: url, options: urlOptions)
            asset = pendingAsset
            state = .loading

            let playableKeys = ["playable"]

            if urgent {
                // FAST PATH: create the AVPlayerItem synchronously, skipping
                // loadValuesAsynchronously + DispatchQueue.main.async.  This
                // avoids the main-queue deferral that stalls background track
                // transitions when iOS throttles the main run loop.  AVPlayer
                // will load asset keys on-demand during buffering — the async
                // pre-load is an optimisation, not a requirement.
                AudioDiagnosticLog.shared.log("LOAD urgent=true url=\(url.lastPathComponent)")

                let playerItem = AVPlayerItem(
                    asset: pendingAsset,
                    automaticallyLoadedAssetKeys: playableKeys
                )
                self.item = playerItem
                playerItem.preferredForwardBufferDuration = self.bufferDuration
                self.avPlayer.replaceCurrentItem(with: playerItem)
                AudioDiagnosticLog.shared.log("REPLACE_ITEM urgent=true")
                self.startObservingAVPlayer(item: playerItem)
                self.applyAVPlayerRate()

                if let initialTime = self.timeToSeekToAfterLoading {
                    self.timeToSeekToAfterLoading = nil
                    self.seek(to: initialTime)
                }

                AudioDiagnosticLog.shared.log("URGENT_LOAD_COMPLETE")
                return
            }

            AudioDiagnosticLog.shared.log("LOAD urgent=false url=\(url.lastPathComponent)")

            // Load metadata keys asynchronously and separate from playable, to allow that to execute as quickly as it can
            let metdataKeys = ["commonMetadata", "availableChapterLocales", "availableMetadataFormats"]
            pendingAsset.loadValuesAsynchronously(forKeys: metdataKeys, completionHandler: { [weak self] in
                guard let self = self else { return }
                if (pendingAsset != self.asset) { return; }

                let commonData = pendingAsset.commonMetadata
                if (!commonData.isEmpty) {
                    self.delegate?.AVWrapper(didReceiveCommonMetadata: commonData)
                }

                if pendingAsset.availableChapterLocales.count > 0 {
                    for locale in pendingAsset.availableChapterLocales {
                        let chapters = pendingAsset.chapterMetadataGroups(withTitleLocale: locale, containingItemsWithCommonKeys: nil)
                        self.delegate?.AVWrapper(didReceiveChapterMetadata: chapters)
                    }
                } else {
                    for format in pendingAsset.availableMetadataFormats {
                        let timeRange = CMTimeRange(start: CMTime(seconds: 0, preferredTimescale: 1000), end: pendingAsset.duration)
                        let group = AVTimedMetadataGroup(items: pendingAsset.metadata(forFormat: format), timeRange: timeRange)
                        self.delegate?.AVWrapper(didReceiveTimedMetadata: [group])
                    }
                }
            })

            // Load playable portion of the track and commence when ready
            pendingAsset.loadValuesAsynchronously(forKeys: playableKeys, completionHandler: { [weak self] in
                guard let self = self else { return }

                DispatchQueue.main.async {
                    if (pendingAsset != self.asset) { return; }

                    for key in playableKeys {
                        var error: NSError?
                        let keyStatus = pendingAsset.statusOfValue(forKey: key, error: &error)
                        switch keyStatus {
                        case .failed:
                            self.playbackFailed(error: AudioPlayerError.PlaybackError.failedToLoadKeyValue)
                            return
                        case .cancelled, .loading, .unknown:
                            return
                        case .loaded:
                            break
                        default: break
                        }
                    }

                    if (!pendingAsset.isPlayable) {
                        self.playbackFailed(error: AudioPlayerError.PlaybackError.itemWasUnplayable)
                        return;
                    }

                    let item = AVPlayerItem(
                        asset: pendingAsset,
                        automaticallyLoadedAssetKeys: playableKeys
                    )
                    self.item = item;
                    item.preferredForwardBufferDuration = self.bufferDuration
                    self.avPlayer.replaceCurrentItem(with: item)
                    AudioDiagnosticLog.shared.log("REPLACE_ITEM urgent=false (ASYNC_LOAD_COMPLETE)")
                    self.startObservingAVPlayer(item: item)
                    self.applyAVPlayerRate()

                    if let initialTime = self.timeToSeekToAfterLoading {
                        self.timeToSeekToAfterLoading = nil
                        self.seek(to: initialTime)
                    }
                }
            })
        }
    }
    
    func load(from url: URL, playWhenReady: Bool, options: [String: Any]? = nil) {
        self.playWhenReady = playWhenReady
        // Reset lastPosition when loading a genuinely new URL
        if self.url != url {
            self.lastPosition = 0
        }
        // New track load — give the watchdog a fresh retry budget.
        self.bufferReloadAttempts = 0
        self.url = url
        self.urlOptions = options
        self.load()
    }
    
    func load(
        from url: URL,
        playWhenReady: Bool,
        initialTime: TimeInterval? = nil,
        options: [String : Any]? = nil
    ) {
        self.load(from: url, playWhenReady: playWhenReady, options: options)
        if let initialTime = initialTime {
            self.seek(to: initialTime)
        }
    }

    func load(
        from url: String,
        type: SourceType = .stream,
        playWhenReady: Bool = false,
        initialTime: TimeInterval? = nil,
        options: [String : Any]? = nil
    ) {
        if let itemUrl = type == .file
            ? URL(fileURLWithPath: url)
            : URL(string: url)
        {
            self.load(from: itemUrl, playWhenReady: playWhenReady, options: options)
            if let initialTime = initialTime {
                self.seek(to: initialTime)
            }
        } else {
            clearCurrentItem()
            playbackFailed(error: AudioPlayerError.PlaybackError.invalidSourceUrl(url))
        }
    }

    func unload() {
        stopBufferWatchdog()
        clearCurrentItem()
        lastPosition = 0
        state = .idle
    }

    func reload(startFromCurrentTime: Bool) {
        let time = startFromCurrentTime ? lastPosition : nil
        load()
        if let time = time, time > 0 {
            seek(to: time)
        }
    }
    
    // MARK: - Util

    private func clearCurrentItem() {
        guard let asset = asset else { return }
        stopObservingAVPlayerItem()

        asset.cancelLoading()
        self.asset = nil
        self.item = nil

        avPlayer.replaceCurrentItem(with: nil)
    }
    
    private func startObservingAVPlayer(item: AVPlayerItem) {
        playerItemObserver.startObserving(item: item)
        playerItemNotificationObserver.startObserving(item: item)
    }

    private func stopObservingAVPlayerItem() {
        playerItemObserver.stopObservingCurrentItem()
        playerItemNotificationObserver.stopObservingCurrentItem()
    }
    
    private func recreateAVPlayer() {
        playbackError = nil
        playerTimeObserver.unregisterForBoundaryTimeEvents()
        playerTimeObserver.unregisterForPeriodicEvents()
        playerObserver.stopObserving()
        stopObservingAVPlayerItem()
        clearCurrentItem()

        avPlayer = AVPlayer();
        setupAVPlayer()

        delegate?.AVWrapperDidRecreateAVPlayer()
    }
    
    private func setupAVPlayer() {
        // disabled since we're not making use of video playback
        avPlayer.allowsExternalPlayback = false;

        playerObserver.player = avPlayer
        playerObserver.startObserving()

        playerTimeObserver.player = avPlayer
        playerTimeObserver.registerForBoundaryTimeEvents()
        playerTimeObserver.registerForPeriodicTimeEvents()

        applyAVPlayerRate()
    }
    
    private func applyAVPlayerRate() {
        avPlayer.rate = playWhenReady ? _rate : 0
    }

    // MARK: - Buffer Stall Watchdog (implementation)

    /// Starts monitoring buffer progress.  If the buffer does not advance
    /// within `bufferStallTimeout` seconds, triggers an automatic reload.
    /// No-ops if a watchdog is already running or max attempts are exceeded.
    private func startBufferWatchdog() {
        guard bufferWatchdog == nil else { return }
        guard bufferReloadAttempts < maxBufferReloadAttempts else {
            AudioDiagnosticLog.shared.log(
                "WATCHDOG_SKIP max_retries_reached (\(maxBufferReloadAttempts))"
            )
            return
        }

        watchdogBufferPosition = bufferedPosition
        AudioDiagnosticLog.shared.log(
            "WATCHDOG_START buffered=\(String(format: "%.1f", watchdogBufferPosition))s"
        )
        scheduleBufferCheck()
    }

    /// Cancels any pending watchdog evaluation.
    private func stopBufferWatchdog() {
        guard bufferWatchdog != nil else { return }
        bufferWatchdog?.cancel()
        bufferWatchdog = nil
        AudioDiagnosticLog.shared.log("WATCHDOG_STOP")
    }

    /// Schedules the next buffer health evaluation after `bufferStallTimeout`.
    private func scheduleBufferCheck() {
        let check = DispatchWorkItem { [weak self] in
            self?.evaluateBufferHealth()
        }
        bufferWatchdog = check
        DispatchQueue.main.asyncAfter(
            deadline: .now() + bufferStallTimeout,
            execute: check
        )
    }

    /// Evaluates whether buffering is making progress or has stalled.
    ///
    /// Three outcomes:
    /// 1. State is no longer buffering or playWhenReady is false → stop.
    /// 2. Silent failure bug detected (buffer full but player still waiting)
    ///    or buffer position has not advanced → reload.
    /// 3. Buffer is advancing (slow connection) → reschedule check.
    private func evaluateBufferHealth() {
        bufferWatchdog = nil

        // Self-stop if conditions no longer apply.
        guard state == .buffering, playWhenReady else {
            AudioDiagnosticLog.shared.log("WATCHDOG_STOP state_changed")
            return
        }

        // Detect the known Apple silent failure bug (rdar://25953728):
        // reasonForWaitingToPlay reports .toMinimizeStalls while the buffer
        // is actually full.  This contradictory state means AVPlayer is
        // internally broken and will never produce audio without a reload.
        if let item = avPlayer.currentItem,
           avPlayer.reasonForWaitingToPlay == .toMinimizeStalls,
           item.isPlaybackBufferFull {
            AudioDiagnosticLog.shared.log(
                "WATCHDOG_SILENT_FAILURE attempt=\(bufferReloadAttempts + 1)/\(maxBufferReloadAttempts)"
            )
            attemptReload()
            return
        }

        // Check if the buffer position has advanced since the last check.
        let currentBuffered = bufferedPosition
        if currentBuffered <= watchdogBufferPosition {
            // Buffer has not advanced — connection is likely dead.
            AudioDiagnosticLog.shared.log(
                "WATCHDOG_STALL buffered=\(String(format: "%.1f", currentBuffered))s " +
                "attempt=\(bufferReloadAttempts + 1)/\(maxBufferReloadAttempts)"
            )
            attemptReload()
        } else {
            // Buffer is advancing — connection is slow but alive.
            // Record the new position and check again after another interval.
            AudioDiagnosticLog.shared.log(
                "WATCHDOG_CHECK buffered=\(String(format: "%.1f", watchdogBufferPosition))s" +
                "→\(String(format: "%.1f", currentBuffered))s"
            )
            watchdogBufferPosition = currentBuffered
            scheduleBufferCheck()
        }
    }

    /// Reloads the current item to establish a fresh network connection.
    /// Increments the retry counter; gives up after `maxBufferReloadAttempts`.
    private func attemptReload() {
        bufferReloadAttempts += 1
        guard bufferReloadAttempts <= maxBufferReloadAttempts else {
            AudioDiagnosticLog.shared.log(
                "WATCHDOG_MAX_RETRIES exceeded (\(maxBufferReloadAttempts))"
            )
            return
        }
        AudioDiagnosticLog.shared.log(
            "WATCHDOG_RELOAD attempt=\(bufferReloadAttempts)/\(maxBufferReloadAttempts) " +
            "position=\(String(format: "%.1f", lastPosition))s"
        )
        reload(startFromCurrentTime: true)
        // After reload, state goes to .loading → .buffering.
        // The watchdog will restart when .buffering is re-entered via
        // the .waitingToPlayAtSpecifiedRate handler.
    }
}

extension AVPlayerWrapper: AVPlayerObserverDelegate {
    
    // MARK: - AVPlayerObserverDelegate
    
    func player(didChangeTimeControlStatus status: AVPlayer.TimeControlStatus) {
        let statusStr = status == .paused ? "paused" : status == .playing ? "playing" : "waiting"
        AudioDiagnosticLog.shared.log("STATUS_CHANGE status=\(statusStr) playWhenReady=\(self.playWhenReady) state=\(self._state)")

        switch status {
        case .paused:
            let state = self.state
            if self.asset == nil && state != .stopped {
                self.state = .idle
            } else if (state != .failed && state != .stopped) {
                // Playback may have become paused externally for example due to a bluetooth device disconnecting:
                if (self.playWhenReady) {
                    // Don't reset playWhenReady during track transitions
                    // or active buffering attempts:
                    // - .loading / nil currentItem: between tracks, pause
                    //   is expected, not user-initiated.
                    // - .buffering: AVPlayer can transiently report .paused
                    //   during a buffering stall (e.g. dead TCP connection
                    //   after a long pause).  This is not an external pause;
                    //   the buffer watchdog will handle recovery.
                    if state == .loading || state == .buffering || self.avPlayer.currentItem == nil {
                        break
                    }
                    // Only if we are not on the boundaries of the track, otherwise itemDidPlayToEndTime will handle it instead.
                    if (self.currentTime > 0 && self.currentTime < self.duration) {
                        self.playWhenReady = false;
                    }
                } else {
                    self.state = .paused
                }
            }
        case .waitingToPlayAtSpecifiedRate:
            if self.asset != nil {
                self.state = .buffering
                // Start the buffer watchdog if we're actively trying to play
                // and no watchdog is already running.  The watchdog will
                // detect dead connections and the Apple silent failure bug,
                // and trigger an automatic reload if needed.
                if self.playWhenReady {
                    self.startBufferWatchdog()
                }
            }
        case .playing:
            self.state = .playing
            // Buffering succeeded — stop the watchdog and reset the retry
            // counter so future stalls get a fresh budget.
            self.stopBufferWatchdog()
            self.bufferReloadAttempts = 0
        @unknown default:
            break
        }
    }
    
    func player(statusDidChange status: AVPlayer.Status) {
        if (status == .failed) {
            let error = item?.error as NSError?
            playbackFailed(error: error?.code == URLError.notConnectedToInternet.rawValue
                 ? AudioPlayerError.PlaybackError.notConnectedToInternet
                 : AudioPlayerError.PlaybackError.playbackFailed
            )
        }
    }
}

extension AVPlayerWrapper: AVPlayerTimeObserverDelegate {
    
    // MARK: - AVPlayerTimeObserverDelegate
    
    func audioDidStart() {
        state = .playing
    }
    
    func timeEvent(time: CMTime) {
        let seconds = time.seconds
        if !seconds.isNaN {
            lastPosition = seconds
        }
        delegate?.AVWrapper(secondsElapsed: seconds)
    }
    
}

extension AVPlayerWrapper: AVPlayerItemNotificationObserverDelegate {
    // MARK: - AVPlayerItemNotificationObserverDelegate

    func itemFailedToPlayToEndTime() {
        playbackFailed(error: AudioPlayerError.PlaybackError.playbackFailed)
        delegate?.AVWrapperItemFailedToPlayToEndTime()
    }
    
    func itemPlaybackStalled() {
        delegate?.AVWrapperItemPlaybackStalled()
    }

    func itemNewErrorLogEntry() {
        guard let playerItem = avPlayer.currentItem,
              let errorLog = playerItem.errorLog(),
              let lastEvent = errorLog.events.last else { return }

        var entry: [String: Any] = [:]
        entry["errorStatusCode"] = lastEvent.errorStatusCode
        entry["errorDomain"] = lastEvent.errorDomain
        if let errorComment = lastEvent.errorComment {
            entry["errorComment"] = errorComment
        }
        if let uri = lastEvent.uri {
            entry["uri"] = uri
        }
        if let serverAddress = lastEvent.serverAddress {
            entry["serverAddress"] = serverAddress
        }
        entry["date"] = lastEvent.date?.timeIntervalSince1970 ?? 0

        delegate?.AVWrapperItemNewErrorLogEntry(entries: [entry])
    }
    
    func itemDidPlayToEndTime() {
        delegate?.AVWrapperItemDidPlayToEndTime()
    }
    
}

extension AVPlayerWrapper: AVPlayerItemObserverDelegate {
    // MARK: - AVPlayerItemObserverDelegate

    func item(didUpdatePlaybackLikelyToKeepUp playbackLikelyToKeepUp: Bool) {
        if (playbackLikelyToKeepUp && state != .playing) {
            state = .ready
        }
    }
        
    func item(didUpdateDuration duration: Double) {
        delegate?.AVWrapper(didUpdateDuration: duration)
    }
    
    func item(didReceiveTimedMetadata metadata: [AVTimedMetadataGroup]) {
        delegate?.AVWrapper(didReceiveTimedMetadata: metadata)
    }

    func item(didChangeBufferEmpty isEmpty: Bool) {
        delegate?.AVWrapper(didChangeBufferEmpty: isEmpty)
    }

    func item(didChangeBufferFull isFull: Bool) {
        delegate?.AVWrapper(didChangeBufferFull: isFull)
    }
}
