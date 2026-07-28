# End-to-End Workflow Reference

## 1. Purpose
This document explains how a contract request moves through the backend from the moment a client sends a request until the workflow decision reaches the BPMN/KIE engine.

## 2. System Overview
The project is a layered Node.js backend that combines:
- Express HTTP routes
- Controllers
- Business services
- Sequelize models and PostgreSQL
- External workflow integration with KIE/jBPM

## 3. Main Request Flow
The most important end-to-end flow is the contract review decision.

### Step 1: Client sends a decision request
A frontend or client sends a request to:
- POST /api/v1/contract-requests/:id/decision

Example payload:
```json
{
  "action": "Approved",
  "comment": "Looks good"
}
```

### Step 2: Route layer validates and authorizes
The route in src/modules/contract/request/routes.js performs:
- authentication
- role authorization
- request validation

Only allowed reviewer roles can continue:
- DEPARTMENT_HEAD
- PROCUREMENT
- LEGAL

### Step 3: Controller forwards the request
The controller in src/modules/contract/request/ContractRequestController.js calls the service with:
- request id
- request body
- authenticated user object

### Step 4: Service loads the contract request
The service in src/modules/contract/request/ContractRequestService.js:
- finds the contract request by id
- checks the reviewer role
- checks whether the request is currently assigned to that reviewer group

### Step 5: Backend builds the BPMN payload
The core mapping happens in _resolveDecision(...).

For example:
- reviewer group: department_heads
- action: Approved

The backend builds:
```json
{
  "deptHeadApproved": true
}
```

This is the payload that will be sent to the workflow engine.

### Step 6: Workflow task service completes the workflow task
The service in src/core/workflow/services/WorkflowTaskService.js receives the BPMN variables and calls the KIE client to complete the current human task.

### Step 7: KIE client sends the payload to jBPM
The KIE client in src/core/workflow/client/KieClient.js sends the payload to the jBPM/KIE server using the completed-task endpoint.

## 4. Payload Building Rules
The backend does not send the raw frontend payload directly to jBPM.
It translates the business decision into BPMN variables.

### Example mappings
#### Department Head review
- Approved -> deptHeadApproved: true
- Rejected -> deptHeadApproved: false
- SentBack -> deptHeadApproved: false

#### Procurement review
- Approved + legalRequired true -> procurementApproved: true, legalRequired: true
- Approved + legalRequired false -> procurementApproved: true, legalRequired: false
- Rejected -> procurementApproved: false
- SentBack -> procurementApproved: false

#### Legal review
- Approved -> legalApproved: true
- Rejected -> legalApproved: false
- SentBack -> legalApproved: false

## 5. Where the data is passed
### Request path
Client -> Route -> Controller -> Service -> WorkflowTaskService -> KieClient -> KIE/jBPM

### Database path
The contract request is also updated in PostgreSQL after the decision is processed.

## 6. Main Files Involved
- src/app.js - application setup
- src/server.js - server startup and DB sync
- src/modules/contract/request/routes.js - endpoint definitions
- src/modules/contract/request/ContractRequestController.js - HTTP entry point
- src/modules/contract/request/ContractRequestService.js - decision mapping and business logic
- src/core/workflow/services/WorkflowTaskService.js - claim/start/complete workflow task
- src/core/workflow/client/KieClient.js - HTTP calls to KIE server
- src/modules/contract/models/ContractRequest.js - contract request persistence
- src/core/workflow/models/WorkflowInstance.js - workflow instance tracking

## 7. End-to-End Example
### Input from client
```json
{
  "action": "Approved"
}
```

### Backend transformation
```json
{
  "deptHeadApproved": true
}
```

### Final workflow send
The transformed payload is sent to the KIE server through the completed-task endpoint.

## 8. Important Notes
- The frontend usually sends a business-friendly action such as Approved or Rejected.
- The backend converts that into BPMN variables.
- The workflow engine uses those variables to route the process forward.
- PostgreSQL is updated to reflect the new status and next review group.

## 9. Summary
The end-to-end flow is:
1. Client sends a business action.
2. Backend validates and authorizes the request.
3. Backend resolves the reviewer group and action.
4. Backend builds BPMN variables.
5. Backend completes the active workflow task in jBPM.
6. PostgreSQL state is updated to match the workflow decision.
