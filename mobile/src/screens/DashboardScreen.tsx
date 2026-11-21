import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Clapperboard,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react-native";
import type { MediaAsset, ProjectRecord } from "../types";
import { colors, radius, withAlpha } from "../theme";
import { Badge, Button, Card, Chip, GradientCard, IconButton, SectionTitle } from "../components/ui";
import { FILTER_PRESETS, type FilterPreset } from "../lib/presets";
import { STUDIO_TEMPLATES, type StudioTemplate } from "../lib/templates";
import { ASPECTS } from "../lib/video";
import { parseEditingPrompt } from "../lib/prompt";
import { importVisualMedia } from "../lib/media";
import { createProjectFromMedia, createProjectFromPrompt, createProjectFromTemplate } from "../lib/create-project";
import { createDefaultPhotoDoc, useProjectStore } from "../store/projects";

export function DashboardScreen({ onOpenProject }: { onOpenProject: (project: ProjectRecord) => void }) {
  const { width } = useWindowDimensions();
  const projects = useProjectStore((s) => s.projects);
  const assets = useProjectStore((s) => s.assets);
  const createProject = useProjectStore((s) => s.createProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const addAssets = useProjectStore((s) => s.addAssets);

  const [busy, setBusy] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [prompt, setPrompt] = useState("Turn these clips into a cinematic montage with slow fades and warm tones.");
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<"photo" | "video">("video");
  const [newAspect, setNewAspect] = useState("16:9");

  const cardWidth = (width - 18 * 2 - 12) / 2;
  const intent = useMemo(() => parseEditingPrompt(prompt), [prompt]);
  const recent = useMemo(() => [...projects].sort((a, b) => b.updatedAt - a.updatedAt), [projects]);
  const assetById = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  async function handleImport() {
    setBusy(true);
    try {
      const { assets: imported, errors } = await importVisualMedia();
      if (errors.length) Alert.alert("Some files were skipped", errors.join("\n"));
      if (!imported.length) return;
      const project = createProjectFromMedia(imported);
      onOpenProject(project);
    } catch (error) {
      Alert.alert("Import failed", (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePromptGenerate() {
    setBusy(true);
    try {
      const { assets: imported, errors } = await importVisualMedia();
      if (errors.length) Alert.alert("Some files were skipped", errors.join("\n"));
      if (!imported.length) return;
      const { project } = createProjectFromPrompt(imported, prompt);
      setPromptOpen(false);
      onOpenProject(project);
    } catch (error) {
      Alert.alert("Could not build project", (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleTemplate(template: StudioTemplate) {
    const project = createProjectFromTemplate(template);
    onOpenProject(project);
  }

  async function handlePreset(preset: FilterPreset) {
    setBusy(true);
    try {
      const { assets: imported, errors } = await importVisualMedia();
      if (errors.length) Alert.alert("Some files were skipped", errors.join("\n"));
      const image = imported.find((a) => a.kind === "image");
      if (!image) {
        Alert.alert("Pick a photo", "Presets are applied to a single photo.");
        return;
      }
      addAssets([image]);
      const photo = createDefaultPhotoDoc("16:9");
      photo.assetId = image.id;
      photo.filterId = preset.id;
      const project = createProject({
        name: image.name.replace(/\.[^.]+$/, ""),
        mode: "photo",
        aspect: photo.aspect,
        thumbnail: image.thumbnailUri ?? image.uri,
        photo,
        template: preset.id,
      });
      onOpenProject(project);
    } finally {
      setBusy(false);
    }
  }

  function handleLongPress(project: ProjectRecord) {
    Alert.alert(project.name, `${project.mode.toUpperCase()} · ${project.aspect}`, [
      { text: "Open", onPress: () => onOpenProject(project) },
      {
        text: "Duplicate",
        onPress: () => duplicateProject(project.id),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteProject(project.id),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleCreateBlank() {
    const project = createProject({
      name: newName.trim() || (newMode === "photo" ? "Untitled photo" : "Untitled video"),
      mode: newMode,
      aspect: newAspect,
    });
    setNewOpen(false);
    setNewName("");
    onOpenProject(project);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <LinearGradient colors={["#8b5cf6", "#22d3ee"]} style={styles.logoMark}>
            <Sparkles color="#fff" size={16} />
          </LinearGradient>
          <View>
            <Text style={styles.logoText}>
              capdit<Text style={styles.logoAccent}>.</Text>
            </Text>
            <Text style={styles.logoSub}>STUDIO</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Badge label="Offline" tone="emerald" />
          <IconButton icon={<Plus color="#fff" size={18} />} onPress={() => setNewOpen(true)} label="New project" />
        </View>
      </View>

      <LinearGradient colors={["#151526", "#0c0d14"]} style={styles.hero}>
        <View style={styles.heroGlow} />
        <Badge label="Local-first · No upload" tone="violet" />
        <Text style={styles.heroTitle}>
          Your pocket{"\n"}
          <Text style={styles.heroAccent}>creative studio</Text>.
        </Text>
        <Text style={styles.heroCopy}>
          Edit photos, cut multi-clip videos, and turn a prompt into a styled montage — all on your device.
        </Text>
        <View style={styles.heroButtons}>
          <Button label="Import media" icon={<Plus color="#fff" size={16} />} onPress={handleImport} loading={busy} />
          <Button
            label="Prompt"
            variant="secondary"
            icon={<Wand2 color={colors.violet} size={16} />}
            onPress={() => setPromptOpen(true)}
          />
        </View>
      </LinearGradient>

      <View style={styles.quickRow}>
        <QuickAction icon={<Wand2 color={colors.violet} size={17} />} title="Video prompt" subtitle="Multi-clip montage" onPress={() => setPromptOpen(true)} />
        <QuickAction icon={<ImageIcon color={colors.cyan} size={17} />} title="Photo grade" subtitle="Filters & presets" onPress={handleImport} />
        <QuickAction icon={<Clapperboard color={colors.emerald} size={17} />} title="Blank project" subtitle="Start from zero" onPress={() => setNewOpen(true)} />
      </View>

      <View style={styles.section}>
        <SectionTitle
          title="Recent projects"
          subtitle={`${projects.length} project${projects.length === 1 ? "" : "s"} saved on this device`}
        />
        {recent.length ? (
          <View style={styles.grid}>
            {recent.map((project) => {
              const thumb = project.thumbnail ?? (project.photo?.assetId ? assetById.get(project.photo.assetId)?.thumbnailUri : undefined);
              return (
                <Pressable
                  key={project.id}
                  onPress={() => onOpenProject(project)}
                  onLongPress={() => handleLongPress(project)}
                  style={({ pressed }) => [styles.projectCard, { width: cardWidth, opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={[styles.thumb, { height: cardWidth * 0.62 }]}>
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={["#1f2937", "#111827"]} style={StyleSheet.absoluteFill} />
                    )}
                    <View style={styles.thumbTop}>
                      <Badge label={project.mode === "photo" ? "Photo" : "Video"} tone={project.mode === "photo" ? "violet" : "muted"} />
                    </View>
                    <View style={styles.thumbBottom}>
                      <Text style={styles.aspectTag}>{project.aspect}</Text>
                    </View>
                  </View>
                  <Text style={styles.projectName} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text style={styles.projectMeta}>{new Date(project.updatedAt).toLocaleDateString()}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <FolderOpen color={colors.muted} size={22} />
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.emptyCopy}>Import a photo or video to start. Everything stays on this device.</Text>
            <Button label="Import media" size="sm" onPress={handleImport} />
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle title="Templates" subtitle="Aspect, pacing and styles configured for you" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
          {STUDIO_TEMPLATES.map((template) => (
            <GradientCard
              key={template.id}
              colors={template.gradient}
              onPress={() => handleTemplate(template)}
              style={styles.templateCard}
            >
              <View style={styles.templateFrame}>
                <Text style={styles.templateFrameText}>CAPDIT</Text>
                {template.mode === "video" ? <Film color="rgba(255,255,255,0.7)" size={12} /> : <ImageIcon color="rgba(255,255,255,0.7)" size={12} />}
              </View>
              <View style={styles.templateMeta}>
                <Text style={styles.templateName} numberOfLines={1}>
                  {template.name}
                </Text>
                <Text style={styles.templateSub}>
                  {template.aspect} · {template.category}
                </Text>
              </View>
            </GradientCard>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionTitle title="Photo presets" subtitle="Pick a look, then choose a photo" />
        <View style={styles.presetGrid}>
          {FILTER_PRESETS.map((preset) => (
            <GradientCard key={preset.id} colors={preset.gradient} onPress={() => handlePreset(preset)} style={styles.presetCard}>
              <View style={styles.presetShade}>
                <Text style={styles.presetName}>{preset.name}</Text>
              </View>
            </GradientCard>
          ))}
        </View>
      </View>

      <Text style={styles.footer}>
        Capdit Mobile · Media is processed locally. Projects are stored in app storage.
      </Text>

      <Modal visible={promptOpen} animationType="slide" transparent onRequestClose={() => setPromptOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setPromptOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>AI editing assistant</Text>
                <Text style={styles.sheetCopy}>Pick multiple videos or photos, then describe the result. The prompt drives grade, pacing, transitions and effects.</Text>
              </View>
              <IconButton icon={<X color={colors.muted} size={17} />} onPress={() => setPromptOpen(false)} />
            </View>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              multiline
              placeholder="Turn these clips into a cinematic montage with slow fades and warm tones."
              placeholderTextColor={withAlpha(colors.muted, 0.7)}
              style={styles.textarea}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
              {[
                "Cinematic montage with slow fades and warm tones.",
                "Fast, energetic vertical TikTok reel.",
                "Smooth aesthetic travel video with crossfades.",
                "Moody film look with glitch cuts.",
              ].map((sample) => (
                <Chip key={sample} label={sample} onPress={() => setPrompt(sample)} />
              ))}
            </ScrollView>
            <Card style={styles.planCard}>
              <Text style={styles.planLabel}>Detected plan</Text>
              <Text style={styles.planText}>{intent.summary}</Text>
              {intent.needsProvider ? (
                <Text style={styles.planWarn}>Needs an AI provider: {intent.needsProvider}</Text>
              ) : null}
            </Card>
            <Button
              label="Choose media & generate"
              icon={<Sparkles color="#fff" size={16} />}
              onPress={handlePromptGenerate}
              loading={busy}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={newOpen} animationType="slide" transparent onRequestClose={() => setNewOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setNewOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Create a new project</Text>
              <IconButton icon={<X color={colors.muted} size={17} />} onPress={() => setNewOpen(false)} />
            </View>
            <Text style={styles.fieldLabel}>Project name</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Untitled project"
              placeholderTextColor={withAlpha(colors.muted, 0.7)}
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Editor</Text>
            <View style={styles.modeRow}>
              {(["photo", "video"] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setNewMode(mode)}
                  style={[styles.modeCard, newMode === mode && styles.modeCardActive]}
                >
                  {mode === "photo" ? <ImageIcon color={colors.violet} size={17} /> : <Film color={colors.cyan} size={17} />}
                  <Text style={styles.modeTitle}>{mode === "photo" ? "Photo" : "Video"}</Text>
                  <Text style={styles.modeCopy}>{mode === "photo" ? "Grade & compose" : "Timeline editing"}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Aspect ratio</Text>
            <View style={styles.chipWrap}>
              {ASPECTS.map((aspect) => (
                <Chip key={aspect.id} label={aspect.id} active={newAspect === aspect.id} onPress={() => setNewAspect(aspect.id)} />
              ))}
            </View>
            <Button label="Create project" onPress={handleCreateBlank} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quick, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={styles.quickIcon}>{icon}</View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSub}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 48, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  logoAccent: { color: colors.violet },
  logoSub: { color: colors.muted, fontSize: 8, letterSpacing: 3, marginTop: -2 },
  hero: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 20, overflow: "hidden", gap: 12 },
  heroGlow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(139,92,246,0.18)",
    top: -140,
    right: -80,
  },
  heroTitle: { color: "#fff", fontSize: 30, lineHeight: 33, fontWeight: "800", letterSpacing: -0.8 },
  heroAccent: { color: "#c4b5fd" },
  heroCopy: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  heroButtons: { flexDirection: "row", gap: 8, marginTop: 4 },
  quickRow: { flexDirection: "row", gap: 8 },
  quick: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    gap: 4,
  },
  quickIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  quickTitle: { color: colors.text, fontSize: 11, fontWeight: "600" },
  quickSub: { color: colors.muted, fontSize: 9 },
  section: { gap: 0 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  projectCard: { gap: 4 },
  thumb: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  thumbTop: { position: "absolute", top: 7, left: 7 },
  thumbBottom: { position: "absolute", bottom: 7, right: 7, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  aspectTag: { color: "#fff", fontSize: 9, fontWeight: "600" },
  projectName: { color: colors.text, fontSize: 12, fontWeight: "600", marginTop: 2 },
  projectMeta: { color: colors.muted, fontSize: 9 },
  emptyCard: { alignItems: "center", gap: 8, paddingVertical: 28, paddingHorizontal: 20 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
  emptyCopy: { color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 16 },
  horizontal: { gap: 10, paddingRight: 4 },
  templateCard: { width: 130, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  templateFrame: {
    height: 78,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  templateFrameText: { color: "rgba(255,255,255,0.9)", fontSize: 9, fontWeight: "800", letterSpacing: 2 },
  templateMeta: { paddingHorizontal: 10, paddingBottom: 10 },
  templateName: { color: "#fff", fontSize: 11, fontWeight: "600" },
  templateSub: { color: "rgba(255,255,255,0.7)", fontSize: 9, marginTop: 1 },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetCard: { width: "31.5%", height: 62, justifyContent: "flex-end" },
  presetShade: { backgroundColor: "rgba(0,0,0,0.18)", padding: 7 },
  presetName: { color: "#fff", fontSize: 10, fontWeight: "700" },
  footer: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 4 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: "#101218",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    paddingBottom: 28,
    gap: 12,
    maxHeight: "92%",
  },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  sheetTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  sheetCopy: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  textarea: {
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: colors.text,
    padding: 12,
    fontSize: 13,
    textAlignVertical: "top",
  },
  planCard: { padding: 12, gap: 3, backgroundColor: "rgba(255,255,255,0.02)" },
  planLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase" },
  planText: { color: "#d4d4d8", fontSize: 11, lineHeight: 16 },
  planWarn: { color: colors.amber, fontSize: 10 },
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
  input: {
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: colors.text,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  modeRow: { flexDirection: "row", gap: 8 },
  modeCard: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    gap: 3,
  },
  modeCardActive: { borderColor: colors.violetBorder, backgroundColor: colors.violetSoft },
  modeTitle: { color: colors.text, fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  modeCopy: { color: colors.muted, fontSize: 9 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
