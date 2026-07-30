# Docqube Integration Guide: Generic Workflow Engine APIs

This guide details how to integrate **Docqube** with the standalone **Workflow Engine Microservice**.

---

## 1. Authentication & Security Setup

The Workflow Engine acts as a trusted microservice and does not maintain its own user database. All requests from Docqube must include a JWT in the `Authorization` header.

### Request Header
```http
Authorization: Bearer <DOCQUBE_ISSUED_JWT>
Content-Type: application/json
```

### Required JWT Claims
Docqube must sign the JWT using the shared `JWT_SECRET` configured in both applications. The token payload **must** include:

```json
{
  "id": "usr_9f83a210-4e2b-4b1a-821f-998811223344",
  "email": "sarah.manager@acme.com",
  "tenantId": "tenant_acme_corp_123",
  "groups": ["acme_department_heads", "acme_procurement_reviewers"]
}
```

* **`tenantId`**: Used by the engine to select customer-specific BPMN workflow definitions.
* **`groups`**: Used by the engine to match active human task potential owners in jBPM.

---

## 2. Integration Stages & Endpoints

### Stage 1: Document / Request Submission
When a user fills out and submits a form (e.g. Contract Request, Purchase Order, Document Approval) in Docqube:

1. **Docqube Action**: Docqube saves the business record in its own database (obtaining a `businessRecordId` e.g., `doc_12345`).
2. **API Call**: Docqube calls the Workflow Engine to start the process.

```http
POST /api/v1/workflow/instances
```

#### Request Body
```json
{
  "workflowCode": "CONTRACT_REQUEST",
  "businessRecordId": "doc_12345",
  "variables": {
    "contractValue": 150000,
    "contractType": "VENDOR_AGREEMENT",
    "department": "Finance"
  },
  "tenantId": "tenant_acme_corp_123"
}
```

#### Response (201 Created)
```json
{
  "status": "success",
  "message": "Workflow process started successfully.",
  "data": {
    "id": "wf_inst_778899",
    "workflow_definition_id": "def_001",
    "process_instance_id": 1042,
    "container_id": "contract-workflow_1.0.0",
    "business_module": "CONTRACT_REQUEST",
    "business_record_id": "doc_12345",
    "status": "ACTIVE",
    "started_by": "usr_9f83a210-4e2b-4b1a-821f-998811223344"
  }
}
```
> **Docqube Action**: Save `data.id` (`workflow_instance_id`) on your local document record for future references.

---

### Stage 2: Checking Active Review Tasks (Inbox / Reviewer View)
When a reviewer opens Docqube or views their Task Inbox:

1. **API Call**: Docqube queries the active tasks for a given workflow instance.

```http
GET /api/v1/workflow/instances/wf_inst_778899/tasks
```

#### Response (200 OK)
```json
{
  "status": "success",
  "data": [
    {
      "id": 5012,
      "name": "DeptHeadReview",
      "status": "Ready",
      "actualOwner": null,
      "potentialOwners": ["acme_department_heads"],
      "processInstanceId": 1042
    }
  ]
}
```
> **Docqube Action**: Docqube compares `potentialOwners` against the logged-in user's groups to display the **Approve / Reject** buttons.

---

### Stage 3: Submitting a Review Decision
When a reviewer clicks **Approve**, **Reject**, or **Send Back** in Docqube's generic approval UI:

1. **API Call**: Docqube completes the specific Human Task on the Workflow Engine.

```http
POST /api/v1/workflow/instances/wf_inst_778899/tasks/5012/complete
```

#### Request Body
```json
{
  "outputVariables": {
    "action": "Approved",
    "comment": "Looks good from my side.",
    "legalRequired": true
  }
}
```

#### Response (200 OK)
```json
{
  "status": "success",
  "message": "Task completed successfully.",
  "data": {
    "actor": "usr_9f83a210-4e2b-4b1a-821f-998811223344",
    "completed": true,
    "workflowState": {
      "processStateName": "ACTIVE",
      "workflowInstanceStatus": "ACTIVE",
      "businessStatus": "LEGAL_REVIEW",
      "assignedGroup": "acme_legal_counsel",
      "assignedGroups": ["acme_legal_counsel"],
      "activeTask": {
        "id": 5013,
        "name": "LegalReview",
        "status": "Ready"
      },
      "isCompleted": false
    }
  }
}
```
> **Docqube Action**: Update your local document status using `workflowState.businessStatus` (`LEGAL_REVIEW`) and `workflowState.assignedGroup` (`acme_legal_counsel`).

---

### Stage 4: Fetching Workflow Tracking / Status
When viewing a document's audit history or current workflow progress bar in Docqube:

1. **API Call**: Docqube retrieves the live status from the engine.

```http
GET /api/v1/workflow/instances/wf_inst_778899/state
```

#### Response (200 OK)
```json
{
  "status": "success",
  "data": {
    "processStateName": "COMPLETED",
    "workflowInstanceStatus": "COMPLETED",
    "businessStatus": "APPROVED",
    "assignedGroup": null,
    "assignedGroups": [],
    "activeTask": null,
    "variables": {
      "contractValue": 150000,
      "deptHeadApproved": true,
      "legalApproved": true
    },
    "isCompleted": true
  }
}
```
> **Docqube Action**: Mark the local document status as `APPROVED` and finalize the workflow lifecycle.

---

## 3. Summary of Generic Endpoints

| Stage | Action | Method | Endpoint |
| :--- | :--- | :--- | :--- |
| **Start** | Initiate a workflow process | `POST` | `/api/v1/workflow/instances` |
| **View** | Get active tasks for a document | `GET` | `/api/v1/workflow/instances/:instanceId/tasks` |
| **Complete** | Submit a reviewer decision | `POST` | `/api/v1/workflow/instances/:instanceId/tasks/:taskId/complete` |
| **Sync/Track**| Get live engine state & tracking | `GET` | `/api/v1/workflow/instances/:instanceId/state` |
