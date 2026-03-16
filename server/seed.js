const User = require("./models/User");

/**
 * Seed demo accounts if they don't already exist.
 * Pre-verified so demos work instantly.
 */
async function seedDemoAccounts() {
    const demos = [
        {
            name: "Dr. Clinician",
            email: "doctor@safemom.com",
            password: "doctor123",
            role: "doctor",
            isEmailVerified: true,
        },
        {
            name: "Rani Devi",
            email: "asha@safemom.com",
            password: "asha123",
            role: "asha",
            isEmailVerified: true,
        },
        {
            name: "Priya Sharma",
            email: "priya@safemom.com",
            password: "priya123",
            role: "mother",
            isEmailVerified: true,
            age: 28,
            gestationWeek: 24,
            bloodGroup: "B+",
            pregnancyNumber: 1,
            chronicConditions: [],
            otherCondition: "",
            onMedication: false,
            medicationNames: "",
        },
        {
            name: "Arjun Sharma",
            email: "partner@safemom.com",
            password: "partner123",
            role: "partner",
            isEmailVerified: true,
        },
    ];

    for (const demo of demos) {
        const exists = await User.findOne({ email: demo.email });
        if (!exists) {
            await User.create(demo);
            console.log(`[Seed] Created demo account: ${demo.email} (${demo.role})`);
        } else {
            console.log(`[Seed] Demo account already exists: ${demo.email}`);
        }
    }
}

module.exports = { seedDemoAccounts };
