import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface OpenApiSpec {
  [key: string]: unknown;
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  components?: {
    securitySchemes?: {
      [key: string]: {
        type: string;
        scheme?: string;
        bearerFormat?: string;
      };
    };
  };
  paths?: {
    [key: string]: unknown;
  };
}

export const getApiDocs = async (): Promise<OpenApiSpec> => {
  const specPath = path.join(process.cwd(), "src/lib/openapi.yaml");
  const fileContents = fs.readFileSync(specPath, "utf8");
  return yaml.load(fileContents) as OpenApiSpec;
};
