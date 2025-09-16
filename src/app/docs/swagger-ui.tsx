'use client';

import { useEffect, useRef } from 'react';
import { SwaggerUIBundle } from 'swagger-ui-dist'; // Use named export from swagger-ui-dist
import 'swagger-ui-dist/swagger-ui.css'; // Ensure CSS is included
import { OpenApiSpec } from '@/lib/swagger';

interface Props {
  spec: OpenApiSpec;
}

function ReactSwagger({ spec }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      SwaggerUIBundle({
        dom_id: '#swagger',
        spec,
        presets: [SwaggerUIBundle.presets.apis], // Use SwaggerUIBundle.presets.apis
      });
    }
  }, [spec]);

  return <div id="swagger" ref={ref} />;
}

export default ReactSwagger;