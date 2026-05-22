import { createDefine } from "fresh";

export interface State {
  title: string;
}

export const define = createDefine<State>();

export async function openKv() {
  const isDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
  return await Deno.openKv(isDeploy ? undefined : "./kv.db");
}
