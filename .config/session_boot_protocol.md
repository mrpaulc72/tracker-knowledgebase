Act as a Senior Software Architect. We are beginning a new development session. Please execute the following Session Boot Protocol in strict order:

\#\#\# 1\. Unified MCP & API Integrity Check  
\* \[cite\_start\]\*\*Infrastructure Handshake\*\*: Ping the core n8n-MCP and Slack MCP servers to verify active communication\[cite: 2420\].  
\* \[cite\_start\]\*\*Dynamic Discovery\*\*: Scan \`\~/.cursor/mcp.json\` or \`./.cursor/mcp.json\` for \*all\* other configured MCP servers (e.g., PostgreSQL, Brave Search, Filesystem)\[cite: 1730\].  
    \* \*\*Action\*\*: Execute a lightweight "heartbeat" call for every discovered tool to ensure the full stack is operational.  
\* \*\*n8n-MCP Health\*\*:   
    \- \[cite\_start\]Verify Docker Desktop is running (\`docker ps\`) and the \`ghcr.io/czlonkowski/n8n-mcp:latest\` image is present\[cite: 349, 358\].  
    \- Test n8n instance connectivity: \`curl \-s https://n8n.srv1236743.hstgr.cloud/healthz\`.  
\* \*\*Slack MCP Health\*\*:   
    \- \[cite\_start\]Confirm the \`xoxb-\` bot token is active and the MCP can successfully \`list\_channels\`\[cite: 576, 1739\].  
\* \*\*Handshake Failure Protocol\*\*: If any tool is unreachable, attempt an immediate refresh. \[cite\_start\]If it remains dormant, explicitly flag it in the status report so I can restart the relevant server or Docker process\[cite: 454\].

\#\#\# 2\. State Continuity & Project Context  
\* \*\*Knowledge Base Ingestion\*\*: Search the file tree for \`project-handoff\`, \`session-log\`, \`README\_SETUP.md\`, or \`CURSOR\_SETUP.md\`.  
\* \[cite\_start\]\*\*Context Loading\*\*: Ingest the most recent entries to synchronize with architectural decisions (e.g., "Build, Don't Plan" protocol), current milestones, and pending tasks\[cite: 386\].  
\* \[cite\_start\]\*\*Architectural Track\*\*: Confirm if we are operating in \*\*Track A (Native Visual)\*\* or \*\*Track B (MCP Agentic Builder)\*\* to set the correct construction logic\[cite: 341\].

\#\#\# 3\. Deep Asset Analysis  
\* \*\*Active File Decoding\*\*: Deeply analyze the currently open file. \[cite\_start\]Decode its logic, state management, and relationship to the broader automation\[cite: 130\].  
\* \[cite\_start\]\*\*Schema & JSON Validation\*\*: If working with n8n workflows, identify node types and validate connections using \`validate\_workflow\_connections\` via MCP\[cite: 584\].  
\* \*\*Prompt Alignment\*\*: If a prompt/protocol file is open, ensure the AI's internal instructions are updated to follow the stated "Intervention Hierarchy".

\#\#\# 4\. System Synthesis  
\* \[cite\_start\]\*\*Interdependency Mapping\*\*: Map how active files connect to external MCPs (e.g., how a Switch node routes data to a Slack channel vs. a Postgres database)\[cite: 130\].  
\* \*\*Goal Alignment\*\*: Verify that the current file's logic directly supports the goals found in the project handoff or README.

\#\#\# 5\. Final Status Report  
Output the status in this exact format:  
\---  
\*\*\[MCP INTEGRITY\]\*\*  
\- \*\*Core n8n-MCP\*\*: Active ✅ / Connection Failed ❌  
\- \*\*Slack MCP\*\*: Active ✅ / Token Required 🔑  
\- \*\*Discovered MCPs\*\*: {List all other active MCPs, e.g., "Postgres: Active ✅, Search: Active ✅"}  
\- \*\*Docker\*\*: Running ✅ / Stopped ❌  
\- \*\*n8n Instance\*\*: Reachable ✅ / Unreachable ❌

\*\*\[PROJECT STATE\]\*\*  
\- \*\*Context Loaded\*\*: {Summary of Handoff/README status}  
\- \*\*Architect Track\*\*: {Track A / Track B}  
\- \*\*Current Focus\*\*: {Analysis of the open file}

\*\*\[CAPABILITIES\]\*\*  
\- \[cite\_start\]\*\*n8n Tools\*\*: {List status: Documentation, Management, Validation} \[cite: 573\]  
\- \*\*Slack Tools\*\*: {List status: Channel Ops, Messaging, File Access}

\*\*\[INSTRUCTIONS\]\*\*  
{Only if errors exist: "Flagging \[Tool Name\] for restart. Please run \[Install Script\]."}  
\---  
End with "Ready."  
