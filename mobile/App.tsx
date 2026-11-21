import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { ProjectRecord } from "./src/types";
import { colors } from "./src/theme";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { PhotoEditorScreen } from "./src/screens/PhotoEditorScreen";
import { VideoEditorScreen } from "./src/screens/VideoEditorScreen";
import { useProjectStore } from "./src/store/projects";

type Route =
  | { name: "dashboard" }
  | { name: "editor"; projectId: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "dashboard" });
  const projects = useProjectStore((s) => s.projects);
  const hydrated = useProjectStore((s) => s.hydrated);

  const project = route.name === "editor" ? projects.find((p) => p.id === route.projectId) : undefined;
  useEffect(() => {
    if (hydrated) return;
    const timer = setTimeout(() => useProjectStore.getState().setHydrated(true), 1500);
    return () => clearTimeout(timer);
  }, [hydrated]);

  const openProject = (next: ProjectRecord) => setRoute({ name: "editor", projectId: next.id });
  const goHome = () => setRoute({ name: "dashboard" });

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        {!hydrated ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.violet} />
            <Text style={styles.loadingText}>Loading studio…</Text>
          </View>
        ) : route.name === "dashboard" || !project ? (
          <DashboardScreen onOpenProject={openProject} />
        ) : project.mode === "photo" ? (
          <PhotoEditorScreen key={project.id} project={project} onBack={goHome} />
        ) : (
          <VideoEditorScreen key={project.id} project={project} onBack={goHome} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.bg },
  loadingText: { color: colors.muted, fontSize: 12 },
});
