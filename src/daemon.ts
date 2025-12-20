import { DaemonService } from "./services/daemon/DaemonService";

// Entry point for the daemon process
await DaemonService.start();

// Keep the process alive
await new Promise(() => {});
