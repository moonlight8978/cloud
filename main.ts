import "module-alias/register";
import { App, CloudBackend, NamedCloudWorkspace } from "cdktf";
import { SystemStack } from "./stacks/sys";
import { AlphaStack } from "./stacks/alpha";
import { AlphaNetworkStack } from "@stacks/alpha/network";

const app = new App();
new SystemStack(app, "sys");
const alpha = new AlphaStack(app, "alpha");
const network = new AlphaNetworkStack(app);

new CloudBackend(alpha, {
  hostname: "app.terraform.io",
  organization: "moonlight8978",
  workspaces: new NamedCloudWorkspace("cloud-alpha", "cloud"),
});

app.synth();
