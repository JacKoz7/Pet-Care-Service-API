import { getApiDocs } from '@/lib/swagger';
import ReactSwagger from './swagger-ui';

export default async function ApiDoc() {
  const spec = await getApiDocs();
  return (
    <section className="w-screen mb-10 p-0 overflow-hidden">
      <ReactSwagger spec={spec} />
    </section>
  );
}