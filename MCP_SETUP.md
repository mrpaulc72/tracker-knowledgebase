# MCP Setup for Tracker Knowledgebase

This document describes the Model Context Protocol (MCP) servers configured for this project.

## Supabase MCP Server

The Supabase MCP server is configured to allow AI assistants to interact with your Supabase database, storage, and other services.

### Current Configuration (Warp)

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

### Recommended Project-Specific Configuration

For better security and scoping, use this enhanced configuration:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=agtmqtquctjygzxuapzu&read_only=false"
    }
  }
}
```

**Benefits of project-scoped URL:**
- Limits MCP access to only this Supabase project
- Prevents accidental operations on other projects
- More secure and controlled access

### What the Supabase MCP Can Do

With this MCP server, AI assistants can:
- ✅ Execute SQL queries on your database
- ✅ List and inspect tables and schemas
- ✅ Manage storage buckets and files
- ✅ Read database logs for debugging
- ✅ Generate TypeScript types from your schema
- ✅ Apply database migrations
- ✅ Manage RLS policies

### Storage Bucket Status

✅ **document-previews** bucket created with:
- Public access: ENABLED
- Max file size: 50MB
- Allowed types: PDF, DOCX
- Used by: `src/lib/ingestion-service.ts` to store PDF files for preview

### Authentication

The MCP server uses OAuth 2.1 authentication with your Supabase account. When you first connect:
1. Warp will open a browser window
2. You'll authenticate with your Supabase account
3. Grant permissions to the MCP server
4. Tokens are securely stored by Warp

### Security Best Practices

⚠️ **Important Security Notes:**
- This is a DEVELOPMENT project - never use MCP with production data
- The MCP server has full access to your Supabase project
- Use `read_only=true` parameter if you want to restrict to read-only operations
- Project scoping (`project_ref` parameter) is highly recommended

### Read-Only Mode

For safer operations, you can enable read-only mode:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=agtmqtquctjygzxuapzu&read_only=true"
    }
  }
}
```

This prevents any write operations (INSERT, UPDATE, DELETE, CREATE, etc.)

## Testing the MCP Connection

After configuration, test the connection by asking Warp:

```
Can you list the tables in my Supabase database?
```

or

```
Show me the schema for the documents table
```

or

```
List the files in the document-previews storage bucket
```

## Project Information

- **Project URL:** https://agtmqtquctjygzxuapzu.supabase.co
- **Project Ref:** agtmqtquctjygzxuapzu
- **Dashboard:** https://supabase.com/dashboard/project/agtmqtquctjygzxuapzu

## Troubleshooting

### MCP Not Connecting
1. Check Warp Settings → AI → MCP Servers
2. Verify the green status indicator next to "supabase"
3. Try re-authenticating by removing and re-adding the server

### Permission Errors
- Ensure you're logged into the correct Supabase account
- Verify you have admin access to the project
- Check that the project_ref matches your actual project

### Storage Access Issues
- Verify the bucket is set to public in Supabase Dashboard → Storage
- Check RLS policies on the documents table
- Ensure service role key is properly set in `.env.local`

## Additional MCP Servers (Future)

Other useful MCP servers you might want to add:
- **GitHub MCP** - For repository management
- **Filesystem MCP** - For local file operations
- **Context7 Docs** - Already configured in your Warp

## References

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Warp MCP Configuration](https://docs.warp.dev/features/agent-mode#mcp-servers)
