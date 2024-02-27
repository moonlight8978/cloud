import {
  CloudBackend,
  DataTerraformRemoteState,
  NamedCloudWorkspace,
} from "cdktf";
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

export class MoonLightTerraformData extends DataTerraformRemoteState {
  constructor(scope: Construct, name: string) {
    super(scope, `${name}-data`, {
      organization: "moonlight8978",
      workspaces: {
        name,
      },
    });
  }
}
