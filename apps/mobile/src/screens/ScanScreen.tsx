import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { analyzeCard, type AnalyzeResult } from "../services/api";

export function ScanScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onPickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Photo library permission is required to continue.");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true
    });

    if (picked.canceled || !picked.assets[0]?.base64) {
      return;
    }

    const asset = picked.assets[0];
    if (!asset.base64 || !asset.uri) {
      Alert.alert("Analyze failed", "Image payload was missing base64 data.");
      return;
    }
    setImageUri(asset.uri);
    setIsLoading(true);
    setResult(null);

    try {
      const analyzed = await analyzeCard(asset.base64);
      setResult(analyzed);
    } catch (error) {
      Alert.alert("Analyze failed", "Could not analyze this image with the API.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>PokeScan</Text>
        <Text style={styles.subtitle}>Scan a graded card and estimate fair market value.</Text>

        <Pressable style={styles.button} onPress={onPickImage}>
          <Text style={styles.buttonText}>Choose Card Photo</Text>
        </Pressable>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}
        {isLoading ? <ActivityIndicator size="large" color="#8c3a2b" /> : null}

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.heading}>Identification</Text>
            <Text style={styles.body}>
              {result.identity.card.name} {result.identity.card.cardNumber} ({result.identity.card.setName})
            </Text>
            <Text style={styles.body}>
              {result.identity.gradingCompany} {result.identity.gradeNumeric} | Confidence {Math.round(result.identity.confidence * 100)}%
            </Text>

            <Text style={styles.heading}>Fair Market Value</Text>
            <Text style={styles.body}>${result.valuation.fairMarketValue.toLocaleString()} USD</Text>
            <Text style={styles.body}>
              Range: ${result.valuation.rangeLow.toLocaleString()} - ${result.valuation.rangeHigh.toLocaleString()}
            </Text>
            <Text style={styles.meta}>
              Based on {result.valuation.sampleSize} comps over {result.valuation.windowDays} days
            </Text>

            {result.needsUserConfirmation ? (
              <Text style={styles.warning}>Low confidence: user confirmation is recommended.</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6efe6"
  },
  container: {
    padding: 20,
    gap: 14
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#2b2623"
  },
  subtitle: {
    fontSize: 15,
    color: "#5d534d"
  },
  button: {
    backgroundColor: "#8c3a2b",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  image: {
    width: "100%",
    height: 260,
    borderRadius: 12,
    backgroundColor: "#ddd"
  },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 8
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2b2623"
  },
  body: {
    fontSize: 15,
    color: "#2b2623"
  },
  meta: {
    fontSize: 13,
    color: "#6d625b"
  },
  warning: {
    marginTop: 4,
    color: "#9c2e2e",
    fontWeight: "600"
  }
});
