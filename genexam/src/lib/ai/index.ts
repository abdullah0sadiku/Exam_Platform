import type { IProviderAdapter, ProviderAdapterConfig } from "./types";
import { OpenAIAdapter } from "./providers/openai";
import { DatabricksAdapter } from "./providers/databricks";
import type { ProviderType } from "@/types";

function getAdapter(providerType: ProviderType): IProviderAdapter {
  switch (providerType) {
    case "openai":
      return new OpenAIAdapter();
    case "databricks":
      return new DatabricksAdapter();
    case "custom":
      return new OpenAIAdapter(); // custom uses OpenAI-compatible API
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}

export { getAdapter };
export type { IProviderAdapter, ProviderAdapterConfig };
export { PROMPT_VERSION } from "./prompts";
