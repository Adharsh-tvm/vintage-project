import mongoose from "mongoose";
import dns from "dns";

// Fix querySrv ECONNREFUSED on MongoDB Atlas by setting reliable public DNS servers
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('Could not set custom DNS servers:', e.message);
}

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`Successfully connected to mongoDB 🌟 `);
    } catch (error) {
        console.error(`ERROR: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;