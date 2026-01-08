import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkStorageBucket() {
    console.log('🔍 Checking Supabase Storage Buckets...\n');

    try {
        // List all buckets
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();

        if (listError) {
            console.error('❌ Error listing buckets:', listError.message);
            return;
        }

        console.log('📦 Existing buckets:');
        if (buckets && buckets.length > 0) {
            buckets.forEach(bucket => {
                console.log(`  - ${bucket.name} (${bucket.public ? 'PUBLIC' : 'PRIVATE'})`);
            });
        } else {
            console.log('  (no buckets found)');
        }

        // Check if document-previews bucket exists
        const documentPreviewsBucket = buckets?.find(b => b.name === 'document-previews');

        if (documentPreviewsBucket) {
            console.log('\n✅ "document-previews" bucket exists');
            console.log(`   Public access: ${documentPreviewsBucket.public ? 'ENABLED ✅' : 'DISABLED ❌'}`);

            if (!documentPreviewsBucket.public) {
                console.log('\n⚠️  The bucket is private. To enable public access:');
                console.log('   1. Go to Supabase Dashboard → Storage');
                console.log('   2. Click on "document-previews" bucket');
                console.log('   3. Click the gear icon (settings)');
                console.log('   4. Enable "Public bucket"');
            }
        } else {
            console.log('\n❌ "document-previews" bucket does NOT exist');
            console.log('\n📝 Creating "document-previews" bucket with public access...');

            const { data: newBucket, error: createError } = await supabase.storage.createBucket('document-previews', {
                public: true,
                fileSizeLimit: 52428800, // 50MB
                allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            });

            if (createError) {
                console.error('❌ Error creating bucket:', createError.message);
                console.log('\n💡 Try creating it manually in the Supabase Dashboard:');
                console.log('   1. Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0]);
                console.log('   2. Navigate to Storage');
                console.log('   3. Create new bucket: "document-previews"');
                console.log('   4. Enable "Public bucket"');
            } else {
                console.log('✅ Successfully created "document-previews" bucket with public access!');
            }
        }

        // Extract project ref from URL
        const projectRef = supabaseUrl.split('//')[1].split('.')[0];
        
        console.log('\n\n🔗 Supabase MCP Configuration for Warp:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('\nHosted MCP URL (recommended):');
        console.log(`https://mcp.supabase.com/mcp?project_ref=${projectRef}&read_only=false`);
        console.log('\nFor Warp:');
        console.log('  1. Open Warp → Settings → AI → MCP Servers');
        console.log('  2. Add new server');
        console.log('  3. Choose "Hosted MCP" type');
        console.log('  4. Paste the URL above');
        console.log('  5. Authenticate with your Supabase account');
        console.log('\nProject Details:');
        console.log(`  Project URL: ${supabaseUrl}`);
        console.log(`  Project Ref: ${projectRef}`);
        console.log(`  Dashboard: https://supabase.com/dashboard/project/${projectRef}`);
        console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error: any) {
        console.error('❌ Unexpected error:', error.message);
    }
}

checkStorageBucket();
