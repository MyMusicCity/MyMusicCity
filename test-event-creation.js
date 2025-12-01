// Quick test to create a simple event and verify database functionality
require('dotenv').config();

async function testEventCreation() {
    try {
        console.log("🧪 TESTING EVENT CREATION");
        console.log("=========================");
        
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        
        // Test creating a simple event via API
        const testEvent = {
            title: "Test Event - Database Verification",
            description: "Testing if database can save events after cleanup",
            date: new Date().toISOString(),
            location: "Nashville, TN",
            source: "test",
            image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format"
        };
        
        console.log("📝 Creating test event:", testEvent.title);
        
        const response = await fetch('https://mymusiccity.onrender.com/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testEvent)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ Test event created successfully:", result._id);
        } else {
            const error = await response.text();
            console.error("❌ Failed to create test event:", response.status, error);
        }
        
        // Check if event appears in database
        console.log("\n🔍 Checking database for test event...");
        const checkResponse = await fetch('https://mymusiccity.onrender.com/api/admin/database/diagnose');
        const diagnostics = await checkResponse.json();
        
        console.log("📊 Database status after test:");
        console.log(`   Total events: ${diagnostics.totals.totalEvents}`);
        console.log(`   Recent events: ${diagnostics.totals.recentEvents}`);
        console.log(`   Status: ${diagnostics.status}`);
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

testEventCreation();