import "module-alias/register";
import { App } from "cdktf";
import { SystemStack } from "./stacks/sys";
import { AlphaNetworkStack } from "@stacks/alpha/network";
import { AlphaLandingPageStack } from "@stacks/alpha/landing-page";

const app = new App();
new SystemStack(app, "sys");
new AlphaNetworkStack(app);
new AlphaLandingPageStack(app);

app.synth();
