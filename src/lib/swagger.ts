import { createSwaggerSpec } from "next-swagger-doc";

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
  const spec = createSwaggerSpec({
    apiFolder: "src/docs/",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Pet Care Service API",
        version: "1.0.0",
        description: "API for pet care service management",
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });
  return spec as OpenApiSpec; 
};
