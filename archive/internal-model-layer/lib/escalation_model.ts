export interface TreeNode {
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  value?: number;
  gain?: number;
}

export interface EscalationModelArtifact {
  version?: string;
  target?: { name?: string; definition?: string; labelSource?: string };
  featureNames?: string[];
  preprocessing?: { means?: number[]; stds?: number[] };
  model?: {
    kind?: string;
    bias?: number;
    weights?: number[];
    threshold?: number;
    baseScore?: number;
    linearBase?: { bias?: number; weights?: number[] };
    learningRate?: number;
    trees?: TreeNode[];
  };
  metrics?: Record<string, unknown>;
  featureImportance?: Array<{ name: string; importance: number }>;
  limitations?: string[];
}

export interface ModelDriver {
  feature: string;
  contribution: number;
  direction: "raises" | "lowers";
}

export function sigmoid(z: number): number {
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

function round(n: number): number {
  return Number(n.toFixed(4));
}

export function standardizeFeatures(raw: number[], model: EscalationModelArtifact): number[] {
  const means = model.preprocessing?.means ?? [];
  const stds = model.preprocessing?.stds ?? [];
  return raw.map((value, index) => (value - (means[index] ?? 0)) / (stds[index] || 1));
}

function treeValue(node: TreeNode | undefined, features: number[]): number {
  if (!node) return 0;
  if (typeof node.value === "number") return node.value;
  const index = node.featureIndex ?? -1;
  const threshold = node.threshold ?? 0;
  if (index < 0) return 0;
  return features[index] <= threshold
    ? treeValue(node.left, features)
    : treeValue(node.right, features);
}

export function modelLogitFromStandardized(features: number[], model: EscalationModelArtifact): number | undefined {
  if (!model?.model) return undefined;
  const kind = model.model.kind ?? (Array.isArray(model.model.weights) ? "logistic_regression" : undefined);

  if (kind === "gradient_boosted_trees") {
    const linearBase = model.model.linearBase;
    const baseScore = (model.model.baseScore ?? 0) +
      (linearBase
        ? (linearBase.bias ?? 0) + features.reduce((sum, value, index) => sum + value * (linearBase.weights?.[index] ?? 0), 0)
        : 0);
    const learningRate = model.model.learningRate ?? 1;
    const trees = model.model.trees ?? [];
    return baseScore + trees.reduce((sum, tree) => sum + learningRate * treeValue(tree, features), 0);
  }

  if (Array.isArray(model.model.weights)) {
    const weights = model.model.weights;
    return (model.model.bias ?? 0) + features.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0);
  }

  return undefined;
}

export function scoreEscalationModel(rawFeatures: number[], model: EscalationModelArtifact): number | undefined {
  if (!model?.featureNames || !model.preprocessing || !model.model) return undefined;
  const standardized = standardizeFeatures(rawFeatures, model);
  const logit = modelLogitFromStandardized(standardized, model);
  return typeof logit === "number" ? sigmoid(logit) : undefined;
}

export function modelThreshold(model: EscalationModelArtifact): number {
  return model.model?.threshold ?? 0.5;
}

export function localModelDrivers(rawFeatures: number[], model: EscalationModelArtifact, limit = 5): ModelDriver[] {
  if (!model?.featureNames || !model.preprocessing || !model.model) return [];
  const standardized = standardizeFeatures(rawFeatures, model);
  const baseLogit = modelLogitFromStandardized(standardized, model);
  if (typeof baseLogit !== "number") return [];
  const baseProbability = sigmoid(baseLogit);

  if (Array.isArray(model.model.weights) && model.model.kind !== "gradient_boosted_trees") {
    return standardized
      .map((value, index) => ({
        feature: model.featureNames?.[index] ?? `feature_${index}`,
        contribution: round(value * (model.model?.weights?.[index] ?? 0)),
        direction: value * (model.model?.weights?.[index] ?? 0) >= 0 ? "raises" as const : "lowers" as const,
      }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, limit);
  }

  // For tree ensembles, approximate local drivers by perturbing each feature to
  // its training mean (standardized value 0) and measuring the probability delta.
  return standardized
    .map((_, index) => {
      const perturbed = [...standardized];
      perturbed[index] = 0;
      const perturbedLogit = modelLogitFromStandardized(perturbed, model);
      const delta = typeof perturbedLogit === "number" ? baseProbability - sigmoid(perturbedLogit) : 0;
      return {
        feature: model.featureNames?.[index] ?? `feature_${index}`,
        contribution: round(delta),
        direction: delta >= 0 ? "raises" as const : "lowers" as const,
      };
    })
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, limit);
}
