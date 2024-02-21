import { App, CloudBackend, NamedCloudWorkspace } from "cdktf";
import { SystemStack } from "./stack/sys";
import { AlphaStack } from "./stack/alpha";

const app = new App();
const system = new SystemStack(app, "sys");
const alpha = new AlphaStack(app, "alpha");

new CloudBackend(system, {
  hostname: "app.terraform.io",
  organization: "moonlight8978",
  workspaces: new NamedCloudWorkspace("cloud-sys", "cloud"),
});

new CloudBackend(alpha, {
  hostname: "app.terraform.io",
  organization: "moonlight8978",
  workspaces: new NamedCloudWorkspace("cloud-alpha", "cloud"),
});

app.synth();
