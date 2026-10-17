import { api } from "./api";

/** Resolve Linux $HOME inside a distribution via wsl.exe. */
export async function wslLinuxHome(distro: string): Promise<string> {
  return api.wsl.home(distro);
}
