import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Sharing from "expo-sharing";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Music2,
  Pause,
  Play,
  Plus,
  Trash2,
  Type,
  Volume2,
} from "lucide-react-native";
import type { Adjustments, MediaAsset, ProjectRecord, VideoClip, VideoDoc } from "../types";
import { colors, radius } from "../theme";
import { Badge, Button, Chip, IconButton, SliderRow } from "../components/ui";
import { ADJUSTMENT_META, ADJUSTMENT_TABS, FILTER_PRESETS } from "../lib/presets";
import { EFFECTS, TRANSITIONS, aspectRatio, computeDuration, createDefaultVideoDoc } from "../lib/video";
import { importAudioFiles, importVisualMedia } from "../lib/media";
import { exportVideo } from "../lib/export-video";
import { useProjectStore } from "../store/projects";

export function VideoEditorScreen({ project, onBack }: { project: ProjectRecord; onBack: () => void }) {
  const { width, height } = useWindowDimensions();
  const assets = useProjectStore((s) => s.assets);
  const addAssets = useProjectStore((s) => s.addAssets);
  const updateVideo = useProjectStore((s) => s.updateVideo);
  const [doc, setDoc] = useState<VideoDoc>(project.video ?? createDefaultVideoDoc(project.aspect));
  const [selectedId, setSelectedId] = useState<string | undefined>(
    doc.clips.find((c) => c.trackId === "track_video")?.id
  );
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [adjustTab, setAdjustTab] = useState("Light");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assetMap = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  const selected = doc.clips.find((c) => c.id === selectedId);
  const visualClips = doc.clips.filter((c) => c.trackId === "track_video").sort((a, b) => a.start - b.start);
  const textClips = doc.clips.filter((c) => c.kind === "text").sort((a, b) => a.start - b.start);
  const audioClips = doc.clips.filter((c) => c.kind === "audio").sort((a, b) => a.start - b.start);
  const activeVisual = visualClips.find((c) => playhead >= c.start && playhead < c.start + c.duration);
  const activeText = doc.clips.find(
    (c) => c.kind === "text" && playhead >= c.start && playhead < c.start + c.duration
  );

  const ratio = aspectRatio(doc.aspect);
  const previewWidth = Math.min(width - 32, height * 0.3 * ratio);
  const previewHeight = previewWidth / ratio;

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateVideo(project.id, doc), 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc, project.id, updateVideo]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      setPlayhead((prev) => {
        const next = prev + delta;
        if (next >= doc.duration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, doc.duration]);

  function reflow(nextDoc: VideoDoc): VideoDoc {
    const ordered = nextDoc.clips.filter((c) => c.trackId === "track_video").sort((a, b) => a.start - b.start);
    let cursor = 0;
    const starts = new Map<string, number>();
    ordered.forEach((clip) => {
      starts.set(clip.id, cursor);
      cursor += clip.duration;
    });
    const clips = nextDoc.clips.map((clip) =>
      starts.has(clip.id) ? { ...clip, start: starts.get(clip.id)! } : clip
    );
    const duration = computeDuration(clips);
    return { ...nextDoc, clips, duration: Math.max(1, duration) };
  }

  function updateClip(id: string, patch: Partial<VideoClip>) {
    setDoc((prev) => {
      const clips = prev.clips.map((c) => (c.id === id ? { ...c, ...patch } : c));
      return { ...prev, clips, duration: Math.max(1, computeDuration(clips)) };
    });
  }

  function updateAdjustment(id: string, key: keyof Adjustments, value: number) {
    setDoc((prev) => ({
      ...prev,
      clips: prev.clips.map((c) =>
        c.id === id ? { ...c, adjustments: { ...c.adjustments, [key]: value } } : c
      ),
    }));
  }

  async function addVisualMedia() {
    setImporting(true);
    try {
      const { assets: imported, errors } = await importVisualMedia();
      if (errors.length) Alert.alert("Some files were skipped", errors.join("\n"));
      if (!imported.length) return;
      addAssets(imported);
      setDoc((prev) => {
        let cursor = Math.max(0, ...prev.clips.filter((c) => c.trackId === "track_video").map((c) => c.start + c.duration));
        const next: VideoDoc = { ...prev, clips: [...prev.clips] };
        for (const asset of imported) {
          if (asset.kind === "audio") continue;
          const kind = asset.kind === "image" ? "image" : "video";
          const duration = kind === "image" ? 4 : Math.min(Math.max(asset.duration ?? 5, 1), 10);
          const clip = createClip(asset, kind, cursor, duration);
          clip.transitionIn = { type: "dissolve", duration: 0.7 };
          next.clips.push(clip);
          cursor += duration;
        }
        const reflowed = reflow(next);
        if (!selectedId) setSelectedId(reflowed.clips.find((c) => c.trackId === "track_video")?.id);
        return reflowed;
      });
    } catch (error) {
      Alert.alert("Import failed", (error as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function addAudioMedia() {
    setImporting(true);
    try {
      const { assets: imported, errors } = await importAudioFiles();
      if (errors.length) Alert.alert("Some files were skipped", errors.join("\n"));
      if (!imported.length) return;
      addAssets(imported);
      setDoc((prev) => {
        const next: VideoDoc = { ...prev, clips: [...prev.clips] };
        for (const asset of imported) {
          const clip = createClip(asset, "audio", 0, Math.min(asset.duration ?? 30, prev.duration || 30));
          clip.volume = 75;
          next.clips.push(clip);
        }
        return next;
      });
    } finally {
      setImporting(false);
    }
  }

  function addTextClip() {
    const start = Math.min(playhead, Math.max(0, doc.duration - 3));
    const clip = createText(start);
    setDoc((prev) => {
      const clips = [...prev.clips, clip];
      return { ...prev, clips, duration: Math.max(prev.duration, start + clip.duration) };
    });
    setSelectedId(clip.id);
  }

  function createClip(asset: MediaAsset, kind: "video" | "image" | "audio", start: number, duration: number): VideoClip {
    return {
      id: `${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      trackId: kind === "audio" ? "track_audio" : "track_video",
      assetId: asset.id,
      name: asset.name,
      kind,
      start,
      duration,
      inPoint: 0,
      speed: 1,
      volume: kind === "audio" ? 75 : 60,
      muted: false,
      opacity: 100,
      scale: 100,
      x: 0,
      y: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      adjustments: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        exposure: 0,
        temperature: 0,
        tint: 0,
        highlights: 0,
        shadows: 0,
        sharpness: 0,
        blur: 0,
        vignette: 0,
        fade: 0,
        grain: 0,
      },
      filterId: null,
      filterIntensity: 100,
      fadeIn: 0,
      fadeOut: 0,
      effect: null,
      transitionIn: { type: "none", duration: 0.6 },
    };
  }

  function createText(start: number): VideoClip {
    const base = createClip(
      { id: "text", name: "Text", kind: "image", mime: "", uri: "", createdAt: Date.now() },
      "image",
      start,
      4
    );
    return {
      ...base,
      trackId: "track_text",
      kind: "text",
      assetId: undefined,
      name: "Text",
      text: "Your text",
      animation: "fade",
      textStyle: {
        fontFamily: "Inter",
        fontSize: 56,
        color: "#ffffff",
        background: "transparent",
        bold: true,
        italic: false,
        align: "center",
        letterSpacing: 0,
        lineHeight: 1.2,
      },
    };
  }

  function moveSelected(direction: -1 | 1) {
    if (!selected || selected.trackId !== "track_video") return;
    setDoc((prev) => {
      const ordered = prev.clips.filter((c) => c.trackId === "track_video").sort((a, b) => a.start - b.start);
      const index = ordered.findIndex((c) => c.id === selected.id);
      const swap = index + direction;
      if (index < 0 || swap < 0 || swap >= ordered.length) return prev;
      const a = { ...ordered[index] };
      const b = { ...ordered[swap] };
      const aStart = a.start;
      a.start = b.start;
      b.start = aStart;
      return reflow({ ...prev, clips: prev.clips.map((c) => (c.id === a.id ? a : c.id === b.id ? b : c)) });
    });
  }

  function deleteSelected() {
    if (!selected) return;
    setDoc((prev) => reflow({ ...prev, clips: prev.clips.filter((c) => c.id !== selected.id) }));
    setSelectedId(undefined);
  }

  function setSpeed(speed: number) {
    if (!selected) return;
    const asset = selected.assetId ? assetMap.get(selected.assetId) : undefined;
    const source = asset?.duration ?? selected.duration;
    const duration = Math.max(0.5, Math.min(30, source / speed));
    updateClip(selected.id, { speed, duration });
  }

  async function handleExport() {
    setExporting(true);
    setProgress(0);
    try {
      const result = await exportVideo({ doc, assets, name: project.name, onProgress: setProgress });
      if (result.saved) {
        Alert.alert("Exported", "Your video was saved to the gallery.");
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: "video/mp4", dialogTitle: "Export video" });
      } else {
        Alert.alert("Exported", result.uri);
      }
    } catch (error) {
      Alert.alert("Export failed", (error as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const keys = ADJUSTMENT_TABS.find((t) => t.id === adjustTab)?.keys ?? ADJUSTMENT_TABS[0].keys;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon={<ArrowLeft color={colors.text} size={18} />} onPress={onBack} label="Back" />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={styles.meta}>
            VIDEO · {doc.aspect} · {doc.duration.toFixed(1)}s
          </Text>
        </View>
        <Button
          label={exporting ? `${Math.round(progress * 100)}%` : "Export"}
          size="sm"
          icon={<Download color="#fff" size={14} />}
          onPress={handleExport}
          loading={exporting}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewWrap}>
          <View style={[styles.preview, { width: previewWidth, height: previewHeight }]}>
            {activeVisual ? (
              <ClipPreview
                key={activeVisual.id}
                clip={activeVisual}
                asset={activeVisual.assetId ? assetMap.get(activeVisual.assetId) : undefined}
                playing={playing}
                playhead={playhead}
              />
            ) : (
              <View style={styles.previewEmpty}>
                <Text style={styles.previewEmptyText}>Add clips to preview</Text>
              </View>
            )}
            {activeText ? (
              <Text
                style={[
                  styles.previewText,
                  {
                    fontSize: Math.max(12, ((activeText.textStyle?.fontSize ?? 48) / 720) * previewHeight),
                    fontWeight: activeText.textStyle?.bold ? "800" : "400",
                    color: activeText.textStyle?.color ?? "#fff",
                  },
                ]}
              >
                {activeText.text}
              </Text>
            ) : null}
            <View style={styles.previewBadge}>
              <Badge label={activeVisual?.filterId ?? "No filter"} tone="violet" />
            </View>
          </View>
        </View>

        <View style={styles.transport}>
          <IconButton
            icon={playing ? <Pause color="#fff" size={18} /> : <Play color="#fff" size={18} />}
            onPress={() => setPlaying((v) => !v)}
            label={playing ? "Pause" : "Play"}
          />
          <Text style={styles.time}>{formatTime(playhead)}</Text>
          <View style={{ flex: 1 }}>
            <SliderRow
              label=""
              value={Math.min(playhead, doc.duration)}
              min={0}
              max={Math.max(1, doc.duration)}
              onChange={(value) => {
                setPlaying(false);
                setPlayhead(value);
              }}
            />
          </View>
          <Text style={styles.time}>{formatTime(doc.duration)}</Text>
        </View>

        <View style={styles.timelineHeader}>
          <Text style={styles.sectionLabel}>Timeline</Text>
          <View style={styles.timelineActions}>
            <Button label="Media" size="sm" variant="secondary" icon={<Plus color="#fff" size={13} />} onPress={addVisualMedia} loading={importing} />
            <Button label="Audio" size="sm" variant="secondary" icon={<Volume2 color="#fff" size={13} />} onPress={addAudioMedia} />
            <Button label="Text" size="sm" variant="secondary" icon={<Type color="#fff" size={13} />} onPress={addTextClip} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeline}>
          {visualClips.map((clip, index) => {
            const asset = clip.assetId ? assetMap.get(clip.assetId) : undefined;
            const thumb = asset?.thumbnailUri ?? asset?.uri;
            const active = clip.id === selectedId;
            return (
              <Pressable
                key={clip.id}
                onPress={() => {
                  setSelectedId(clip.id);
                  setPlayhead(clip.start);
                  setPlaying(false);
                }}
                style={[styles.clip, { width: Math.max(64, Math.min(160, clip.duration * 26)) }, active && styles.clipActive]}
              >
                {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={StyleSheet.absoluteFill} />}
                <View style={styles.clipShade} />
                <View style={styles.clipTop}>
                  <Text style={styles.clipIndex}>{index + 1}</Text>
                  {clip.transitionIn.type !== "none" ? <Text style={styles.clipTransition}>{clip.transitionIn.type}</Text> : null}
                </View>
                <Text style={styles.clipDuration}>{clip.duration.toFixed(1)}s</Text>
              </Pressable>
            );
          })}
          {!visualClips.length ? (
            <Pressable style={styles.addClip} onPress={addVisualMedia}>
              <Plus color={colors.muted} size={18} />
              <Text style={styles.addClipText}>Add clips</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {(textClips.length > 0 || audioClips.length > 0) ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeline}>
            {textClips.map((clip) => (
              <Pressable
                key={clip.id}
                onPress={() => {
                  setSelectedId(clip.id);
                  setPlayhead(clip.start);
                  setPlaying(false);
                }}
                style={[styles.trackChip, clip.id === selectedId && styles.trackChipActive]}
              >
                <Type color="#ddd6fe" size={13} />
                <Text style={styles.trackChipText} numberOfLines={1}>
                  {clip.text || "Text"}
                </Text>
              </Pressable>
            ))}
            {audioClips.map((clip) => (
              <Pressable
                key={clip.id}
                onPress={() => {
                  setSelectedId(clip.id);
                  setPlayhead(clip.start);
                  setPlaying(false);
                }}
                style={[styles.trackChip, clip.id === selectedId && styles.trackChipActive]}
              >
                <Music2 color={colors.emerald} size={13} />
                <Text style={styles.trackChipText} numberOfLines={1}>
                  {clip.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.timelineFooter}>
          <Button label="Move left" size="sm" variant="ghost" icon={<ChevronLeft color={colors.muted} size={14} />} onPress={() => moveSelected(-1)} />
          <Button label="Move right" size="sm" variant="ghost" icon={<ChevronRight color={colors.muted} size={14} />} onPress={() => moveSelected(1)} />
          <View style={{ flex: 1 }} />
          <Button label="Delete clip" size="sm" variant="ghost" icon={<Trash2 color={colors.red} size={14} />} onPress={deleteSelected} />
        </View>

        {selected ? (
          <View style={styles.inspector}>
            <Text style={styles.sectionLabel}>{selected.kind === "text" ? "Text" : "Inspector"}</Text>
            {selected.kind === "audio" ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.hintText}>Audio clip · {selected.name}</Text>
                <SliderRow
                  label="Volume"
                  value={selected.volume}
                  min={0}
                  max={100}
                  onChange={(value) => updateClip(selected.id, { volume: value })}
                />
                <SliderRow
                  label="Fade out"
                  value={selected.fadeOut}
                  min={0}
                  max={3}
                  onChange={(value) => updateClip(selected.id, { fadeOut: value })}
                />
              </View>
            ) : selected.kind === "text" ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={selected.text ?? ""}
                  onChangeText={(text) => updateClip(selected.id, { text })}
                  placeholder="Type your text"
                  placeholderTextColor={colors.muted}
                  style={styles.textInput}
                />
                <SliderRow
                  label="Font size"
                  value={selected.textStyle?.fontSize ?? 56}
                  min={12}
                  max={120}
                  onChange={(value) =>
                    updateClip(selected.id, {
                      textStyle: { ...selected.textStyle!, fontSize: value },
                    })
                  }
                />
              </View>
            ) : (
              <>
                <Text style={styles.subLabel}>Filter</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Chip label="None" active={!selected.filterId} onPress={() => updateClip(selected.id, { filterId: null })} />
                  {FILTER_PRESETS.map((preset) => (
                    <Chip
                      key={preset.id}
                      label={preset.name}
                      active={selected.filterId === preset.id}
                      onPress={() => updateClip(selected.id, { filterId: preset.id })}
                    />
                  ))}
                </ScrollView>

                <Text style={styles.subLabel}>Adjust</Text>
                <View style={styles.chipRow}>
                  {ADJUSTMENT_TABS.map((item) => (
                    <Chip key={item.id} label={item.id} active={adjustTab === item.id} onPress={() => setAdjustTab(item.id)} />
                  ))}
                </View>
                <View style={{ marginTop: 6 }}>
                  {keys.map((key) => (
                    <SliderRow
                      key={key}
                      label={ADJUSTMENT_META[key].label}
                      value={selected.adjustments[key] ?? 0}
                      min={ADJUSTMENT_META[key].min}
                      max={ADJUSTMENT_META[key].max}
                      onChange={(value) => updateAdjustment(selected.id, key, value)}
                    />
                  ))}
                </View>

                <Text style={styles.subLabel}>Transition in</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {TRANSITIONS.map((transition) => (
                    <Chip
                      key={transition.id}
                      label={transition.label}
                      active={selected.transitionIn.type === transition.id}
                      onPress={() =>
                        updateClip(selected.id, { transitionIn: { type: transition.id as VideoClip["transitionIn"]["type"], duration: selected.transitionIn.duration } })
                      }
                    />
                  ))}
                </ScrollView>
                <SliderRow
                  label="Transition duration"
                  value={selected.transitionIn.duration}
                  min={0}
                  max={2}
                  onChange={(value) =>
                    updateClip(selected.id, { transitionIn: { ...selected.transitionIn, duration: value } })
                  }
                />

                <Text style={styles.subLabel}>Effect</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {EFFECTS.map((effect) => (
                    <Chip
                      key={effect.id}
                      label={effect.label}
                      active={(selected.effect ?? "none") === effect.id}
                      onPress={() => updateClip(selected.id, { effect: effect.id === "none" ? null : effect.id })}
                    />
                  ))}
                </ScrollView>

                <Text style={styles.subLabel}>Speed</Text>
                <View style={styles.chipRow}>
                  {[0.5, 1, 1.5, 2].map((speed) => (
                    <Chip key={speed} label={`${speed}x`} active={selected.speed === speed} onPress={() => setSpeed(speed)} />
                  ))}
                </View>

                <SliderRow
                  label="Volume"
                  value={selected.volume}
                  min={0}
                  max={100}
                  onChange={(value) => updateClip(selected.id, { volume: value })}
                />
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ClipPreview({
  clip,
  asset,
  playing,
  playhead,
}: {
  clip: VideoClip;
  asset?: MediaAsset;
  playing: boolean;
  playhead: number;
}) {
  if (clip.kind === "image") {
    return asset ? <Image source={{ uri: asset.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : null;
  }
  return <VideoClipStage clip={clip} asset={asset} playing={playing} playhead={playhead} />;
}

function VideoClipStage({
  clip,
  asset,
  playing,
  playhead,
}: {
  clip: VideoClip;
  asset?: MediaAsset;
  playing: boolean;
  playhead: number;
}) {
  const player = useVideoPlayer(asset?.uri ?? null, (p) => {
    p.loop = false;
  });
  const playheadRef = useRef(playhead);
  playheadRef.current = playhead;

  function seek() {
    const local = clip.inPoint + Math.max(0, playheadRef.current - clip.start) * clip.speed;
    try {
      if (player.currentTime < clip.inPoint || Math.abs(player.currentTime - local) > 0.4) {
        player.currentTime = local;
      }
    } catch {
      /* player not ready yet */
    }
  }

  useEffect(() => {
    seek();
    if (playing) player.play();
    else player.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.id, playing, player]);

  useEffect(() => {
    if (!playing) seek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playhead, playing]);

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 9, letterSpacing: 1, marginTop: 1 },
  content: { paddingBottom: 44, gap: 10 },
  previewWrap: { alignItems: "center" },
  preview: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  previewEmptyText: { color: colors.muted, fontSize: 11 },
  previewBadge: { position: "absolute", top: 8, left: 8 },
  previewText: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: "18%",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowRadius: 6,
  },
  transport: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14 },
  time: { color: colors.muted, fontSize: 10, fontVariant: ["tabular-nums"] },
  timelineHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8 },
  timelineActions: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  sectionLabel: { color: colors.text, fontSize: 13, fontWeight: "700" },
  timeline: { gap: 6, paddingHorizontal: 14 },
  clip: {
    height: 58,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-between",
    padding: 5,
  },
  clipActive: { borderColor: colors.violet, borderWidth: 2 },
  clipShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" },
  clipTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clipIndex: { color: "#fff", fontSize: 9, fontWeight: "700", backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 4, borderRadius: 4 },
  clipTransition: { color: "#ddd6fe", fontSize: 7, textTransform: "uppercase" },
  clipDuration: { color: "#fff", fontSize: 9, fontWeight: "600", alignSelf: "flex-end" },
  addClip: {
    width: 90,
    height: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  addClipText: { color: colors.muted, fontSize: 9 },
  timelineFooter: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10 },
  trackChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    maxWidth: 160,
  },
  trackChipActive: { borderColor: colors.violet },
  trackChipText: { color: colors.text, fontSize: 10, flexShrink: 1 },
  hintText: { color: colors.muted, fontSize: 11 },
  inspector: {
    marginHorizontal: 14,
    marginTop: 6,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    gap: 6,
  },
  subLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginTop: 6 },
  chipRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", paddingRight: 4 },
  textInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: colors.text,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 13,
  },
});
