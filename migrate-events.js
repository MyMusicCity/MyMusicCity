const mongoose = require('mongoose');

// Both use the same database cluster now, but check different database names
// Old: Used 'MyMusicCity' database name
// New: Uses 'mymusiccity' database name (where scrapers save events)
const MONGO_URI = "mongodb+srv://jakedseals_db_user:zGsll0PkzRDsDZzd@mymusiccity.nlcnv6s.mongodb.net/?retryWrites=true&w=majority";

async function migrateEvents() {
  console.log('🔄 Starting event migration...');
  
  try {
    // Connect to the database cluster
    console.log('📡 Connecting to database...');
    await mongoose.connect(MONGO_URI);
    
    // Access different databases within the same cluster
    console.log('\n🔍 Checking for events in different databases...');
    
    // Check 'mymusiccity' database (where scrapers should save)
    const mymusiccityConnection = mongoose.connection.useDb('mymusiccity');
    const mymusiccityEvents = await mymusiccityConnection.collection('events').find({}).toArray();
    console.log(`Found ${mymusiccityEvents.length} events in 'mymusiccity' database`);
    
    // Check 'MyMusicCity' database (old name)
    const MyMusicCityConnection = mongoose.connection.useDb('MyMusicCity'); 
    const MyMusicCityEvents = await MyMusicCityConnection.collection('events').find({}).toArray();
    console.log(`Found ${MyMusicCityEvents.length} events in 'MyMusicCity' database`);
    
    // Check the default database (whatever's in the connection string)
    const defaultEvents = await mongoose.connection.db.collection('events').find({}).toArray();
    console.log(`Found ${defaultEvents.length} events in default database`);
    
    // Determine which database has the most events (likely the scraped ones)
    let sourceEvents, sourceName;
    if (mymusiccityEvents.length > MyMusicCityEvents.length && mymusiccityEvents.length > defaultEvents.length) {
      sourceEvents = mymusiccityEvents;
      sourceName = "'mymusiccity' database";
    } else if (MyMusicCityEvents.length > defaultEvents.length) {
      sourceEvents = MyMusicCityEvents;
      sourceName = "'MyMusicCity' database";
    } else {
      sourceEvents = defaultEvents;
      sourceName = "default database";
    }
    
    console.log(`\n📊 Using ${sourceName} as source (${sourceEvents.length} events)`);
    
    if (sourceEvents.length === 0) {
      console.log('❌ No events found to migrate');
      return;
    }
    
    // Show sample of events being used
    console.log('\n📋 Sample events found:');
    sourceEvents.slice(0, 5).forEach((event, i) => {
      console.log(`  ${i+1}. ${event.title} - ${event.source} - ${new Date(event.date).toLocaleDateString()}`);
    });
    
    // Ensure events go to the production database that Vercel is reading from
    const targetCollection = mymusiccityConnection.collection('events'); // This is where Vercel expects them
    
    // Clear existing events in target database
    console.log('\n🗑️ Clearing existing events in target database...');
    const deleteResult = await targetCollection.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing events`);
    
    // Insert events into target database
    console.log('💾 Inserting events into target database...');
    const insertResult = await targetCollection.insertMany(sourceEvents);
    console.log(`✅ Successfully inserted ${insertResult.insertedCount} events`);
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const newEventCount = await targetCollection.countDocuments();
    console.log(`Target database now has ${newEventCount} events`);
    
    console.log('\n🎉 Event migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
}

migrateEvents().catch(console.error);