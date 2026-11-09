// Import only from server code. Signing credentials never enter frontend modules.
import { coreConfig, makeCoreClient } from "../../../supabase/functions/_shared/coreClient.ts";
export const coreClient = () => makeCoreClient(coreConfig(name => process.env[name]));

