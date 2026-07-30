# Complete Workflow Execution Audit Report

This report traces the execution path from the moment a user submits an approval until the next task becomes active and synchronized, based on the decoupled architecture.

### Execution Flow Overview

1. The **User** sends a POST request with their approval decision.
2. The **Router & Controller** receives the request and delegates it to the **ContractRequestService**.
3. The **ContractRequestService** validates authorization against the **WorkflowTaskService**.
4. The **WorkflowTaskService** queries the **KieClient** to confirm the user has an active task assigned to them on the engine.
5. Once authorized, the **ContractRequestService** sends the workflow variables back to the **WorkflowTaskService** to complete the task.
6. The **WorkflowTaskService** triggers the Claim/Start/Complete lifecycle on the **KieClient**, which executes an HTTP PUT to the **jBPM / KIE Server**.
7. The **jBPM / KIE Server** takes over, evaluates gateway logic, and transitions the process to the next Human Task.
8. The **WorkflowTaskService** then fetches the updated process instance state and new active tasks via the **KieClient**.
9. This new generic state is synchronized internally, and a normalized `workflowState` is returned to the **ContractRequestService**.
10. Finally, the **ContractRequestService** updates the specific business record (`ContractRequest`) in PostgreSQL with the new status and assignment, and the controller responds to the user.

---

### Step-by-Step Analysis

#### 1. User submits approval
- **Class/Module:** `routes.js` and `ContractRequestController.js`
- **Execution:** The router uses the `authenticate` middleware to establish user identity. The controller passes the request parameters to the service layer.
- **Evaluation:** Responsibilities are strictly defined. The controller handles HTTP transport, while Node makes zero workflow decisions here.

#### 2. Node validates the request
- **Class/Module:** `ContractRequestService.js` and `WorkflowTaskService.js`
- **Execution:** `ContractRequestService` queries PostgreSQL for the business record, then asks `WorkflowTaskService.canUserActOnRecord` if the user is authorized. `WorkflowTaskService` queries the KIE Server for active tasks and evaluates if the user's KIE User ID or resolved KIE Groups match the potential owners of the current task.
- **Evaluation:** Responsibilities are correct. Authorization is fully decoupled from the business module; `ContractRequestService` acts blindly based on the boolean returned by the workflow integration layer.

#### 3. Node sends only workflow variables to jBPM
- **Class/Module:** `ContractRequestService.js`, `WorkflowTaskService.js`, and `KieClient.js`
- **Execution:** `ContractRequestService` packages pure facts (`requestId`, `action`, `legalRequired`) into `workflowVariables` and delegates to `WorkflowTaskService.completeWorkflow`. `WorkflowTaskService` executes the `Claim -> Start -> Complete` lifecycle on the KIE Server via the `KieClient`.
- **Evaluation:** No hardcoded mapping occurs here (e.g. converting `'Approved'` to `'APPROVED_STATUS'`). Node faithfully delegates the user's raw input variables to the engine. There is no duplicated logic.

#### 4. jBPM evaluates the BPMN
- **Class/Module:** jBPM Execution Engine (External to Node)
- **Execution:** jBPM reads the output variables passed by Node during task completion and processes gateways and sequence flows defined in the BPMN diagram.
- **Evaluation:** Purely engine territory. Node is entirely disconnected from this evaluation phase.

#### 5. jBPM creates the next Human Task
- **Class/Module:** jBPM Execution Engine (External to Node)
- **Execution:** jBPM reaches the next state in the BPMN. If it is a Human Task, it assigns potential owners based on lanes or data assignments within the diagram.
- **Evaluation:** Again, Node is uninvolved. The next step and assignment are derived entirely from the BPMN definition.

#### 6. Node retrieves the active task
- **Class/Module:** `WorkflowTaskService.js` and `WorkflowStateMapper.js`
- **Execution:** Immediately after task completion, `WorkflowTaskService` invokes `getWorkflowStateForBusinessRecord`. It fetches the current process instance and newly created active tasks from KIE. `WorkflowStateMapper` normalizes this unstructured JSON into a predictable `workflowState` object.
- **Evaluation:** Responsibilities are robust. The integration layer and mapping layer contain all jBPM-specific knowledge. 

#### 7. PostgreSQL is synchronized using the workflow state
- **Class/Module:** `WorkflowTaskService.js` and `ContractRequestService.js`
- **Execution:** `WorkflowTaskService` performs an internal sync on the generic `WorkflowInstance` tracking table. `ContractRequestService` reads `businessStatus` and `assignedGroup` from the returned `workflowState` and updates the `ContractRequest` PostgreSQL record.
- **Evaluation:** Responsibilities are correct. Node is strictly acting as a synchronized data-cache for the workflow engine. If the BPMN logic dictates the status is now `LEGAL_REVIEW` assigned to `legal_managers`, Node will blindly apply this state without any business-level switch statements or overrides.

### Conclusion

The audit verifies that **Node.js makes zero workflow decisions**. The `ContractRequestService` is free of hardcoded routing logic and transition states. All business definitions are safely handed off to the jBPM execution engine, and PostgreSQL acts securely as a read-model synchronized immediately after engine transitions.
