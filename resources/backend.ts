import { CloudBackend, NamedCloudWorkspace } from "cdktf";
import { Construct } from "constructs";

export class MoonLightTerraformBackend extends CloudBackend {
  constructor(scope: Construct, name: string) {
    super(scope, {
      hostname: "app.terraform.io",
      organization: "moonlight8978",
      workspaces: new NamedCloudWorkspace(name, "cloud"),
    });
  }
}
