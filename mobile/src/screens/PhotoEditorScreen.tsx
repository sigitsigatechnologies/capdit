import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useCanvasRef } from "@shopify/react-native-skia";
import * as Sharing from "expo-sharing";
import {
  ArrowLeft,
  Check,
  Download,
  ImagePlus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react-native";
import { DEFAULT_ADJUSTMENTS, type Adjustments, type PhotoDoc, type ProjectRecord } from "../types";
import { colors, radius } from "../theme";
import { Badge, Button, Chip, IconButton, SliderRow } from "../components/ui";
import { PhotoCanvas } from "../components/PhotoCanvas";
import { ADJUSTMENT_META, ADJUSTMENT_TABS, FILTER_PRESETS } from "../lib/presets";
import { ASPECTS, aspectRatio } from "../lib/video";
import { importVisualMedia } from "../lib/media";
import { exportPhoto } from "../lib/export-photo";
import { createDefaultPhotoDoc, useProjectStore } from "../store/projects";

type Tab = "filters" | "adjust";

export function PhotoEditorScreen({ project, onBack }: { project: ProjectRecord; onBack: () => void }) {
  const { width, height } = useWindowDimensions();
  const updatePhoto = useProjectStore((s) => s.updatePhoto);
  const updateProject = useProjectStore((s) => s.updateProject);
  const addAssets = useProjectStore((s) => s.addAssets);
  const canvasRef = useCanvasRef();
  const [photo, setPhoto] = useState<PhotoDoc>(project.photo ?? createDefaultPhotoDoc(project.aspect));
  const [tab, setTab] = useState<Tab>("filters");
  const [adjustTab, setAdjustTab] = useState("Light");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ratio = aspectRatio(photo.aspect ?? project.aspect);
  const maxHeight = height * 0.52;
  const canvasWidth = Math.min(width - 36, maxHeight * ratio);
  const canvasHeight = canvasWidth / ratio;

  const keys = useMemo(
    () => ADJUSTMENT_TABS.find((t) => t.id === adjustTab)?.keys ?? ADJUSTMENT_TABS[0].keys,
    [adjustTab]
  );

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updatePhoto(project.id, photo), 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [photo, project.id, updatePhoto]);

  function patch(partial: Partial<PhotoDoc>) {
    setPhoto((prev) => ({ ...prev, ...partial }));
  }

  function setAdjustment(key: keyof Adjustments, value: number) {
    setPhoto((prev) => ({ ...prev, adjustments: { ...prev.adjustments, [key]: value } }));
  }

  async function handleImport() {
    setImporting(true);
    try {
      const { assets: imported, errors } = await importVisualMedia();
      if (errors.length) Alert.alert("Some files were skipped", errors.join("\n"));
      const image = imported.find((a) => a.kind === "image");
      if (!image) {
        Alert.alert("Pick a photo", "The photo editor needs an image.");
        return;
      }
      addAssets([image]);
      const next = { ...photo, assetId: image.id };
      setPhoto(next);
      const current = useProjectStore.getState().getProject(project.id);
      if (current) {
        updateProject({ ...current, photo: next, thumbnail: image.thumbnailUri ?? image.uri, aspect: next.aspect });
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportPhoto(canvasRef, project.name);
      if (result.saved) {
        Alert.alert("Exported", "Your image was saved to the gallery.");
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: "image/jpeg", dialogTitle: "Export photo" });
      } else {
        Alert.alert("Exported", result.uri);
      }
    } catch (error) {
      Alert.alert("Export failed", (error as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon={<ArrowLeft color={colors.text} size={18} />} onPress={onBack} label="Back" />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={styles.meta}>
            PHOTO · {photo.aspect ?? project.aspect}
          </Text>
        </View>
        <Button
          label={exporting ? "Exporting…" : "Export"}
          size="sm"
          icon={<Download color="#fff" size={14} />}
          onPress={handleExport}
          loading={exporting}
        />
      </View>

      <View style={styles.canvasWrap}>
        <View style={[styles.canvasFrame, { width: canvasWidth, height: canvasHeight }]}>
          <PhotoCanvas photo={photo} width={canvasWidth} height={canvasHeight} canvasRef={canvasRef} />
          {!photo.assetId ? (
            <Pressable style={styles.canvasEmpty} onPress={handleImport}>
              <ImagePlus color={colors.violet} size={28} />
              <Text style={styles.canvasEmptyTitle}>Add a photo</Text>
              <Text style={styles.canvasEmptyCopy}>Tap to choose from your gallery</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.quickRow}>
        <Badge label={photo.filterId ? `Filter · ${photo.filterId}` : "No filter"} tone="violet" />
        <View style={{ flex: 1 }} />
        <Button
          label="Change photo"
          variant="ghost"
          size="sm"
          icon={<ImagePlus color={colors.muted} size={14} />}
          onPress={handleImport}
          loading={importing}
        />
        <IconButton
          icon={<RotateCcw color={colors.muted} size={16} />}
          label="Reset edits"
          onPress={() =>
            setPhoto((prev) => ({
              ...prev,
              filterId: null,
              filterIntensity: 100,
              adjustments: { ...DEFAULT_ADJUSTMENTS },
            }))
          }
        />
      </View>

      <View style={styles.aspectRow}>
        <Text style={styles.rowLabel}>Aspect</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {ASPECTS.map((aspect) => (
            <Chip key={aspect.id} label={aspect.id} active={photo.aspect === aspect.id} onPress={() => patch({ aspect: aspect.id })} />
          ))}
        </ScrollView>
        <Chip label={photo.fit === "cover" ? "Cover" : "Fit"} onPress={() => patch({ fit: photo.fit === "cover" ? "contain" : "cover" })} />
      </View>

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab("filters")} style={[styles.tab, tab === "filters" && styles.tabActive]}>
          <Sparkles color={tab === "filters" ? "#ddd6fe" : colors.muted} size={14} />
          <Text style={[styles.tabText, tab === "filters" && styles.tabTextActive]}>Filters</Text>
        </Pressable>
        <Pressable onPress={() => setTab("adjust")} style={[styles.tab, tab === "adjust" && styles.tabActive]}>
          <SlidersHorizontal color={tab === "adjust" ? "#ddd6fe" : colors.muted} size={14} />
          <Text style={[styles.tabText, tab === "adjust" && styles.tabTextActive]}>Adjust</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.controls} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {tab === "filters" ? (
          <View style={{ gap: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Pressable
                onPress={() => patch({ filterId: null })}
                style={[styles.filterNone, photo.filterId === null && styles.filterNoneActive]}
              >
                <Text style={styles.filterNoneText}>None</Text>
                {photo.filterId === null ? <Check color={colors.violet} size={12} /> : null}
              </Pressable>
              {FILTER_PRESETS.map((preset) => (
                <Pressable key={preset.id} onPress={() => patch({ filterId: preset.id })} style={styles.filterCard}>
                  <View style={[styles.filterSwatch, { backgroundColor: preset.gradient[0] }]}>
                    <View style={[styles.filterSwatchBottom, { backgroundColor: preset.gradient[1] }]} />
                    {photo.filterId === preset.id ? (
                      <View style={styles.filterCheck}>
                        <Check color="#fff" size={11} />
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.filterName} numberOfLines={1}>
                    {preset.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {photo.filterId ? (
              <SliderRow
                label="Filter intensity"
                value={photo.filterIntensity}
                min={0}
                max={100}
                onChange={(value) => patch({ filterIntensity: value })}
              />
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={styles.adjustTabs}>
              {ADJUSTMENT_TABS.map((item) => (
                <Chip key={item.id} label={item.id} active={adjustTab === item.id} onPress={() => setAdjustTab(item.id)} />
              ))}
            </View>
            {keys.map((key) => {
              const meta = ADJUSTMENT_META[key];
              return (
                <SliderRow
                  key={key}
                  label={meta.label}
                  value={photo.adjustments[key] ?? 0}
                  min={meta.min}
                  max={meta.max}
                  onChange={(value) => setAdjustment(key, value)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 9, letterSpacing: 1, marginTop: 1 },
  canvasWrap: { alignItems: "center", paddingVertical: 8 },
  canvasFrame: {
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#000",
  },
  canvasEmpty: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(7,8,12,0.72)",
  },
  canvasEmptyTitle: { color: colors.text, fontSize: 13, fontWeight: "600" },
  canvasEmptyCopy: { color: colors.muted, fontSize: 10 },
  quickRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingTop: 6 },
  aspectRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingTop: 10 },
  rowLabel: { color: colors.muted, fontSize: 10, width: 42 },
  tabs: { flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.violetSoft, borderColor: colors.violetBorder },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  tabTextActive: { color: "#ddd6fe" },
  controls: { flex: 1, paddingHorizontal: 14, paddingTop: 4 },
  filterCard: { width: 66, gap: 4 },
  filterSwatch: { width: 66, height: 66, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  filterSwatchBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "45%" },
  filterCheck: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.violet,
    alignItems: "center",
    justifyContent: "center",
  },
  filterName: { color: colors.muted, fontSize: 9, textAlign: "center" },
  filterNone: {
    width: 66,
    height: 66,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  filterNoneActive: { borderColor: colors.violetBorder, backgroundColor: colors.violetSoft },
  filterNoneText: { color: colors.text, fontSize: 10, fontWeight: "600" },
  adjustTabs: { flexDirection: "row", gap: 6 },
});
