import { App, CloudBackend, NamedCloudWorkspace } from "cdktf";
import { SystemStack } from "./stack/sys";

const app = new App();
const system = new SystemStack(app, "sys");

new CloudBackend(system, {
  hostname: "app.terraform.io",
  organization: "moonlight8978",
  workspaces: new NamedCloudWorkspace("cloud"),
});

app.synth();
