/**
 * DEPRECATED — ContractRequest domain removed from this engine.
 *
 * Business form data (contract requests) is owned and managed by Docqube.
 * This workflow engine is generic and business-agnostic.
 *
 * Workflow interactions are now handled via:
 *   POST   /api/v1/workflow/instances
 *   GET    /api/v1/workflow/instances/:instanceId/state
 *   GET    /api/v1/workflow/instances/:instanceId/tasks
 *   POST   /api/v1/workflow/instances/:instanceId/tasks/:taskId/complete
 */
