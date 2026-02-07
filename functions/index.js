/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const nodemailer = require("nodemailer");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Email transporter (optional; set secrets in production)
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_PASSWORD,
	},
});

// ============================================
// Callable: User Signup
// ============================================
exports.signupUser = functions.https.onCall(async (data, context) => {
	try {
		const { email, password, displayName, role } = data || {};
		if (!email || !password || !displayName || !role) {
			throw new functions.https.HttpsError(
				"invalid-argument",
				"Missing required fields: email, password, displayName, role"
			);
		}
		if (!["student", "mentor"].includes(role)) {
			throw new functions.https.HttpsError("invalid-argument", "Invalid role");
		}
		const userRecord = await admin.auth().createUser({ email, password, displayName });
		const db = admin.firestore();
		await db.collection("users").doc(userRecord.uid).set({
			uid: userRecord.uid,
			email,
			displayName,
			role,
			profilePicture: "",
			bio: "",
			verified: false,
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
			lastLogin: null,
			status: "active",
		});
		await sendVerificationEmail(email, userRecord.uid);
		return { success: true, uid: userRecord.uid, message: "User created. Check email for verification." };
	} catch (err) {
		throw new functions.https.HttpsError("internal", err.message || "Signup failed");
	}
});

// ============================================
// Callable: Login (metadata update)
// ============================================
exports.loginUser = functions.https.onCall(async (data, context) => {
	try {
		const { email } = data || {};
		if (!email) {
			throw new functions.https.HttpsError("invalid-argument", "Email required");
		}
		const db = admin.firestore();
		const snapshot = await db.collection("users").where("email", "==", email).limit(1).get();
		if (snapshot.empty) {
			throw new functions.https.HttpsError("not-found", "User not found");
		}
		const doc = snapshot.docs[0];
		const user = doc.data();
		if (!user.verified) {
			throw new functions.https.HttpsError("permission-denied", "Email not verified");
		}
		if (user.status !== "active") {
			throw new functions.https.HttpsError("permission-denied", "Account not active");
		}
		await doc.ref.update({ lastLogin: admin.firestore.FieldValue.serverTimestamp() });
		return { success: true, user: { uid: user.uid, email: user.email, displayName: user.displayName, role: user.role } };
	} catch (err) {
		throw new functions.https.HttpsError("internal", err.message || "Login failed");
	}
});

// ============================================
// Callable: Request Password Reset
// ============================================
exports.requestPasswordReset = functions.https.onCall(async (data, context) => {
	try {
		const { email } = data || {};
		if (!email) {
			throw new functions.https.HttpsError("invalid-argument", "Email required");
		}
		const link = await admin.auth().generatePasswordResetLink(email);
		await sendPasswordResetEmail(email, link);
		return { success: true, message: "Password reset link sent" };
	} catch (err) {
		throw new functions.https.HttpsError("internal", err.message || "Reset failed");
	}
});

// ============================================
// Callable: Google Login handler (creates user if missing)
// ============================================
exports.handleGoogleLogin = functions.https.onCall(async (data, context) => {
	try {
		const { idToken } = data || {};
		if (!idToken) {
			throw new functions.https.HttpsError("invalid-argument", "ID token required");
		}
		const decoded = await admin.auth().verifyIdToken(idToken);
		const { uid, email, name, picture } = decoded;
		const db = admin.firestore();
		const ref = db.collection("users").doc(uid);
		const doc = await ref.get();
		if (!doc.exists) {
			await ref.set({
				uid,
				email,
				displayName: name || "User",
				role: "student",
				profilePicture: picture || "",
				bio: "",
				verified: true,
				createdAt: admin.firestore.FieldValue.serverTimestamp(),
				updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				lastLogin: admin.firestore.FieldValue.serverTimestamp(),
				status: "active",
			});
		} else {
			await ref.update({ lastLogin: admin.firestore.FieldValue.serverTimestamp() });
		}
		const dataOut = (await ref.get()).data();
		return { success: true, user: { uid: dataOut.uid, email: dataOut.email, displayName: dataOut.displayName, role: dataOut.role } };
	} catch (err) {
		throw new functions.https.HttpsError("internal", err.message || "Google login failed");
	}
});

// ============================================
// Callable: Verify Email (flip verified flag)
// ============================================
exports.verifyEmail = functions.https.onCall(async (data, context) => {
	try {
		const { uid } = data || {};
		if (!uid) {
			throw new functions.https.HttpsError("invalid-argument", "UID required");
		}
		const db = admin.firestore();
		await db.collection("users").doc(uid).update({ verified: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
		return { success: true, message: "Email verified" };
	} catch (err) {
		throw new functions.https.HttpsError("internal", err.message || "Verify failed");
	}
});

// Helper: Send Verification Email
async function sendVerificationEmail(email, uid) {
	const verificationLink = `https://venz-edu-app.web.app/verify?uid=${uid}`;
	const mailOptions = {
		from: process.env.GMAIL_USER,
		to: email,
		subject: "Verify your Venz Edu account",
		html: `<p>Please verify your email:</p><p><a href="${verificationLink}">Verify Email</a></p>`,
	};
	if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) return; // Skip if not set
	await transporter.sendMail(mailOptions);
}

// Helper: Send Password Reset Email
async function sendPasswordResetEmail(email, link) {
	const mailOptions = {
		from: process.env.GMAIL_USER,
		to: email,
		subject: "Reset your Venz Edu password",
		html: `<p>Click to reset:</p><p><a href="${link}">Reset Password</a></p>`,
	};
	if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) return; // Skip if not set
	await transporter.sendMail(mailOptions);
}

// ============================================
// Callable: Seed Firestore with stable IDs (idempotent)
// ============================================
exports.seedFirestore = functions.https.onCall(async (data, context) => {
	try {
		const token = (data && data.token) || "";
		if (!token) {
			throw new functions.https.HttpsError("permission-denied", "Seed token required");
		}

		const db = admin.firestore();

		// Users (fixed IDs)
		const adminRef = db.collection("users").doc("admin-sample");
		await adminRef.set({
			uid: "admin-sample",
			email: "admin@venz-edu.local",
			displayName: "Admin User",
			role: "admin",
			verified: true,
			status: "active",
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
		}, { merge: true });

		const mentorRef = db.collection("users").doc("mentor-sample");
		await mentorRef.set({
			uid: "mentor-sample",
			email: "mentor@venz-edu.local",
			displayName: "Sample Mentor",
			role: "mentor",
			verified: true,
			status: "active",
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
		}, { merge: true });

		const studentRef = db.collection("users").doc("student-sample");
		await studentRef.set({
			uid: "student-sample",
			email: "student@venz-edu.local",
			displayName: "Sample Student",
			role: "student",
			verified: true,
			status: "active",
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
		}, { merge: true });

		// Course (fixed ID)
		const courseRef = db.collection("courses").doc("course-sample");
		await courseRef.set({
			title: "Mastering Java: From Zero to Hero",
			description: "Comprehensive Java course aligned with dashboard",
			mentorId: mentorRef.id,
			mentorName: "Sample Mentor",
			category: "programming",
			level: "beginner",
			price: 0,
			thumbnail: "assets/logo.png",
			duration: "4 weeks",
			maxStudents: 50,
			enrolledCount: 1,
			rating: 4.8,
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
			isPublished: true,
		}, { merge: true });

		// Assignment (fixed ID)
		const assignmentRef = db.collection("assignments").doc("assignment-sample");
		await assignmentRef.set({
			courseId: courseRef.id,
			title: "Assignment 1: Intro to Java",
			description: "Write your first Java program",
			dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
			maxScore: 100,
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
		}, { merge: true });

		// Enrollment (fixed ID)
		const enrollmentRef = db.collection("enrollments").doc("enrollment-sample");
		await enrollmentRef.set({
			studentId: studentRef.id,
			courseId: courseRef.id,
			enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
			progress: 35,
			status: "active",
			lastAccessed: admin.firestore.FieldValue.serverTimestamp(),
			completedLessons: 14,
		}, { merge: true });

		// Submission (fixed ID)
		const submissionRef = db.collection("submissions").doc("submission-sample");
		await submissionRef.set({
			assignmentId: assignmentRef.id,
			studentId: studentRef.id,
			fileUrl: "https://example.com/submissions/demo.zip",
			status: "submitted",
			score: null,
			feedback: "",
			submittedAt: admin.firestore.FieldValue.serverTimestamp(),
			gradedAt: null,
		}, { merge: true });

		return {
			success: true,
			created: {
				users: [adminRef.id, mentorRef.id, studentRef.id],
				courseId: courseRef.id,
				assignmentId: assignmentRef.id,
				enrollmentId: enrollmentRef.id,
				submissionId: submissionRef.id,
			},
		};
	} catch (err) {
		throw new functions.https.HttpsError("internal", err.message || "Seeding failed");
	}
});
