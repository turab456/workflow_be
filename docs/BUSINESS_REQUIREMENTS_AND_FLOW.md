# Business Requirements and Project Flow

## 1. Project Objective

This project is designed to manage and automate the lifecycle of contract requests within an organization.

The main business problem it solves is:
- collecting contract requests from business users
- routing them through approval stages
- ensuring the correct reviewers act on the request
- tracking the status of each request
- integrating the approval process with a workflow engine for execution and monitoring

---

## 2. Business Problem Statement

Without this system, contract review and approval often happen manually through emails, spreadsheets, or disconnected communication channels.

This leads to:
- delayed approvals
- unclear ownership
- inconsistent review decisions
- poor visibility into the approval state
- risk of missing required review steps

This backend system introduces a structured, auditable, and workflow-driven process for handling contract requests.

---

## 3. What the System Solves

The platform helps the organization to:

1. Create contract requests 
2. Capture request details such as title, department, vendor, contract value, and scope of work
3. Assign requests to the right review groups
4. Allow reviewers to approve, reject, or send requests back
5. Move requests through defined workflow stages
6. Maintain an audit trail of all actions taken
7. Connect the business process with a BPMN-based workflow engine

---

## 4. Actors in the Business Process

### Business User
A user who submits a contract request.

Responsibilities:
- create a contract request
- provide contract-related details
- edit the request while it is still in a editable state

### Department Head
The first reviewer in the workflow.

Responsibilities:
- review the request
- approve or reject it
- send it back for correction if needed

### Procurement Reviewer
The second reviewer in the process.

Responsibilities:
- review the business request after department head approval
- decide whether legal review is required
- approve or reject the request

### Legal Reviewer
The final review stage for legal compliance.

Responsibilities:
- review legal aspects of the contract request
- approve or reject it

### System Administrator / Super Admin
A technical or business administrator who can oversee the process and manage system operations.

---

## 5. Business Workflow Overview

The workflow begins when a business user submits a contract request.

The request then moves through the following stages:

1. Draft / Submitted state
2. Department Head Review
3. Procurement Review
4. Legal Review
5. Approval or Rejection
6. Optional send-back for corrections

---

## 6. End-to-End Business Flow

### Step 1: Request Submission
A business user creates a contract request with the required information.

Example information captured:
- request title
- description
- department
- vendor
- contract type
- contract value
- duration
- scope of work

### Step 2: Initial Workflow Assignment
Once submitted, the request is assigned to the Department Head review group.

This means the request is now waiting for the first review decision.

### Step 3: Department Head Review
The department head reviews the request and can choose one of the following:
- Approve
- Reject
- Send Back

If approved, the request moves to Procurement Review.

### Step 4: Procurement Review
The procurement reviewer evaluates the request.

At this stage, they can:
- approve and continue to Legal Review if legal review is required
- approve and complete the flow if legal review is not required
- reject the request
- send it back for revision

### Step 5: Legal Review
If required, the request is sent to the Legal reviewer.

The legal reviewer can then:
- approve the contract request
- reject the request
- send it back for revision

### Step 6: Final Outcome
Based on the decisions made at each stage, the request is finalized as:
- Approved
- Rejected
- Sent Back

---

## 7. Business Rules Covered

The system implements several business rules:

- Only authorized users can act on a request
- A request can only be processed by the reviewer group assigned to it
- Approval decisions influence the next workflow step
- Business users can edit requests only in allowed states
- The workflow should preserve an audit trail of each decision

---

## 8. What the Backend Is Doing for the Business

The backend acts as the operational engine for the business workflow.

It performs the following tasks:
- stores request information
- enforces role-based access
- routes the request through the approval stages
- translates user decisions into workflow variables
- sends the decision to the workflow engine
- updates the contract request status and review group
- records the timeline of actions

---

## 9. Business Value Delivered

This solution provides:
- faster contract approvals
- clearer accountability
- consistent approval logic
- better visibility into workflow status
- reduced manual follow-up and human error

---

## 10. Summary

In simple business terms, this project automates the approval journey of a contract request.

It ensures that a contract request:
- starts from a business user submission
- moves through the proper review layers
- receives decisions from the correct stakeholders
- reaches a final approved or rejected state
- remains visible and traceable throughout the process

This makes the organization more efficient, more controlled, and more transparent in how contracts are handled.
