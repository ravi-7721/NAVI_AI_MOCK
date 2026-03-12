import Vapi from "@vapi-ai/web";

const vapiToken = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;

export const vapi = vapiToken ? new Vapi(vapiToken) : null;
