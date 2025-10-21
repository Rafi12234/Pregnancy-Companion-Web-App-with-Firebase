import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Community.css";
import Navbar from "../Navbar/Navbar";
import Sidebar from "../Sidebar/Sidebar";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  orderBy,
  runTransaction,
} from "firebase/firestore";

/* ============== Firebase init (guarded) ============== */
const firebaseConfig = {
  apiKey: "AIzaSyAoRjjijmlodBuN1qmdILxbZI88vuYkH7s",
  authDomain: "pregnancy-companion-web-app.firebaseapp.com",
  projectId: "pregnancy-companion-web-app",
  storageBucket: "pregnancy-companion-web-app.firebasestorage.app",
  messagingSenderId: "265131162037",
  appId: "1:265131162037:web:86710007f91282fe6541fc",
  measurementId: "G-40G11VGE47",
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* Helpers */
const TZ = "Asia/Dhaka";
const now13 = () => Date.now().toString();
const fmtTime = (ts) => {
  try {
    const d = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return "—";
  }
};
const MAX_LEN = 800;

const Community = () => {
  const [me, setMe] = useState({ email: "", name: "", photo: "" });
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);

  const [feed, setFeed] = useState([]);
  const [commentsOpen, setCommentsOpen] = useState({});
  const [newComment, setNewComment] = useState({});
  const textareaRef = useRef(null);

  /* Auth + profile */
  useEffect(() => {
    let unsubProfile = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!user) {
        setMe({ email: "", name: "", photo: "" });
        return;
      }

      const email = (user.email || "").trim();
      const profileRef = doc(db, "Users", email, "Profile", "profile");
      unsubProfile = onSnapshot(profileRef, (snap) => {
        const data = snap.exists() ? snap.data() || {} : {};
        setMe({
          email,
          name: (data.motherName ?? user.displayName ?? email).toString(),
          photo: (data.Image ?? "").toString(),
        });
      });
    });
    return () => {
      unsubAuth && unsubAuth();
      unsubProfile && unsubProfile();
    };
  }, []);

  /* Feed Listener */
  useEffect(() => {
    const postsUnsubs = new Map();

    const cleanupPosts = () => {
      postsUnsubs.forEach((fn) => fn && fn());
      postsUnsubs.clear();
    };

    const communityUnsub = onSnapshot(
      collection(db, "Community"),
      (snap) => {
        const currentEmails = new Set();
        snap.forEach((d) => currentEmails.add(d.id));
        [...postsUnsubs.keys()].forEach((email) => {
          if (!currentEmails.has(email)) {
            const fn = postsUnsubs.get(email);
            fn && fn();
            postsUnsubs.delete(email);
          }
        });

        snap.forEach((d) => {
          const parentEmail = d.id;
          if (postsUnsubs.has(parentEmail)) return;

          const q = query(
            collection(db, "Community", parentEmail, "posts"),
            orderBy("post_time", "desc")
          );
          const unsub = onSnapshot(q, (ps) => {
            const all = [];
            ps.forEach((p) =>
              all.push({ id: p.id, parentEmail, ...(p.data() || {}) })
            );

            setFeed((prev) => {
              const others = prev.filter((x) => x.parentEmail !== parentEmail);
              const merged = [...others, ...all];
              merged.sort((a, b) => {
                const ta = a.post_time?.toMillis?.() ?? 0;
                const tb = b.post_time?.toMillis?.() ?? 0;
                return tb - ta;
              });
              return merged;
            });
          });

          postsUnsubs.set(parentEmail, unsub);
        });
      },
      (err) => {
        console.error("Community listener error:", err);
      }
    );

    return () => {
      communityUnsub && communityUnsub();
      cleanupPosts();
    };
  }, []);

  const canPost = useMemo(() => {
    const t = postText.trim();
    return me.email && t.length > 0 && t.length <= MAX_LEN && !posting;
  }, [me.email, postText, posting]);

  /* Create Post */
  const submitPost = async () => {
    if (!canPost) return;
    try {
      setPosting(true);

      const parentDocRef = doc(db, "Community", me.email);
      await setDoc(
        parentDocRef,
        {
          Name: me.name,
          email: me.email,
          Post_time: serverTimestamp(),
        },
        { merge: true }
      );

      const postId = `post_${now13()}`;
      const postRef = doc(
        collection(db, "Community", me.email, "posts"),
        postId
      );
      await setDoc(postRef, {
        content: postText.trim(),
        name: me.name,
        email: me.email,
        post_time: serverTimestamp(),
        reactionCount: 0,
        reactions: {},
      });

      setPostText("");
      textareaRef.current?.focus();
    } catch (e) {
      alert(e.message || "Failed to post.");
    } finally {
      setPosting(false);
    }
  };

  /* Toggle Heart */
  const toggleHeart = async (parentEmail, postId) => {
    if (!me.email) return;
    const ref = doc(db, "Community", parentEmail, "posts", postId);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const data = snap.data() || {};
        const reactions = { ...(data.reactions || {}) };
        let count = Number(data.reactionCount || 0);

        if (reactions[me.email]) {
          delete reactions[me.email];
          count = Math.max(0, count - 1);
        } else {
          reactions[me.email] = true;
          count = count + 1;
        }
        tx.update(ref, { reactions, reactionCount: count });
      });
    } catch (e) {
      alert(e.message || "Could not react.");
    }
  };

  /* Comments */
  const [commentsMap, setCommentsMap] = useState({});
  const unsubComments = useRef({});

  const postKey = (parentEmail, postId) => `${parentEmail}__${postId}`;

  const openComments = (parentEmail, postId) => {
    setCommentsOpen((s) => ({ ...s, [postId]: !s[postId] }));
    const key = postKey(parentEmail, postId);

    if (!unsubComments.current[key]) {
      const cRef = collection(
        db,
        "Community",
        parentEmail,
        "posts",
        postId,
        "comments"
      );
      const qy = query(cRef, orderBy("createdAt", "asc"));
      unsubComments.current[key] = onSnapshot(qy, (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() || {}) }));
        setCommentsMap((m) => ({ ...m, [key]: list }));
      });
    }
  };

  const submitComment = async (parentEmail, postId) => {
    const key = postKey(parentEmail, postId);
    const text = (newComment[postId] || "").trim();
    if (!text || !me.email) return;
    try {
      const cRef = collection(
        db,
        "Community",
        parentEmail,
        "posts",
        postId,
        "comments"
      );
      await addDoc(cRef, {
        text,
        authorName: me.name,
        authorEmail: me.email,
        createdAt: serverTimestamp(),
      });
      setNewComment((s) => ({ ...s, [postId]: "" }));
    } catch (e) {
      alert(e.message || "Failed to comment.");
    }
  };

  useEffect(() => {
    return () => {
      Object.values(unsubComments.current).forEach((fn) => fn && fn());
    };
  }, []);

  return (
    <div className="comm-root">
        <Navbar />
        <Sidebar />
      <div className="comm-container">
        {/* Hero Header */}
        <div className="comm-hero">
          <div className="comm-hero-bg">
            <div className="comm-hero-wave"></div>
          </div>
          <div className="comm-hero-content">
            <h1 className="comm-hero-title">
              <span className="comm-hero-icon">💬</span>
              Mother's Community
            </h1>
            <p className="comm-hero-subtitle">
              Share your journey, support each other, grow together
            </p>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="comm-profile-card">
          <div className="comm-avatar-wrapper">
            {me.photo ? (
              <img src={me.photo} alt="Profile" className="comm-avatar-img" />
            ) : (
              <div className="comm-avatar-placeholder">
                {(me.name || me.email || "U")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((s) => s[0]?.toUpperCase())
                  .join("")}
              </div>
            )}
            <div className="comm-status-dot"></div>
          </div>
          <div className="comm-user-info">
            <h2 className="comm-user-name">{me.name || "Your Name"}</h2>
            <p className="comm-user-email">{me.email || "Not signed in"}</p>
          </div>
        </div>

        {/* Post Composer */}
        <div className="comm-composer">
          <div className="comm-composer-header">
            <span className="comm-composer-icon">✍️</span>
            <h3>What's on your mind?</h3>
          </div>
          <textarea
            ref={textareaRef}
            value={postText}
            onChange={(e) => setPostText(e.target.value.slice(0, MAX_LEN))}
            placeholder="Share your feelings, experiences, or ask for advice..."
            className="comm-composer-textarea"
            rows="4"
          />
          <div className="comm-composer-footer">
            <div className="comm-char-counter">
              <span
                className={`comm-counter-text ${
                  postText.length > MAX_LEN ? "comm-over-limit" : ""
                }`}
              >
                {postText.length}/{MAX_LEN}
              </span>
              <div className="comm-counter-bar">
                <div
                  className="comm-counter-progress"
                  style={{
                    width: `${(postText.length / MAX_LEN) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
            <button
              className="comm-post-btn"
              onClick={submitPost}
              disabled={!canPost}
              title={me.email ? "" : "Sign in to post"}
            >
              {posting ? (
                <>
                  <span className="comm-btn-spinner"></span>
                  Posting...
                </>
              ) : (
                <>
                  <span className="comm-btn-icon">📮</span>
                  Share Post
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="comm-feed">
          {feed.length === 0 ? (
            <div className="comm-feed-empty">
              <div className="comm-empty-icon">🌸</div>
              <h3>No posts yet</h3>
              <p>Be the first to share your journey</p>
            </div>
          ) : (
            feed.map((post) => {
              const hearted = !!post.reactions?.[me.email];
              const commentsCount =
                commentsMap[`${post.parentEmail}__${post.id}`]?.length || 0;

              return (
                <article
                  className="comm-post-card"
                  key={`${post.parentEmail}_${post.id}`}
                >
                  {/* Post Header */}
                  <div className="comm-post-header">
                    <div className="comm-post-avatar">
                      {(post.name || post.email || "U")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((s) => s[0]?.toUpperCase())
                        .join("")}
                    </div>
                    <div className="comm-post-meta">
                      <h4 className="comm-post-author">{post.name}</h4>
                      <p className="comm-post-time">{fmtTime(post.post_time)}</p>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="comm-post-content">
                    <p>{post.content}</p>
                  </div>

                  {/* Post Actions */}
                  <div className="comm-post-actions">
                    <button
                      className={`comm-action-btn ${
                        hearted ? "comm-hearted" : ""
                      }`}
                      onClick={() => toggleHeart(post.parentEmail, post.id)}
                      title={hearted ? "Unlike" : "Love"}
                    >
                      <span className="comm-action-icon">
                        {hearted ? "❤️" : "🤍"}
                      </span>
                      <span className="comm-action-text">
                        {post.reactionCount || 0} {hearted ? "Loved" : "Love"}
                      </span>
                    </button>

                    <button
                      className={`comm-action-btn ${
                        commentsOpen[post.id] ? "comm-comment-active" : ""
                      }`}
                      onClick={() => openComments(post.parentEmail, post.id)}
                    >
                      <span className="comm-action-icon">💬</span>
                      <span className="comm-action-text">
                        {commentsCount > 0
                          ? `${commentsCount} Comment${
                              commentsCount > 1 ? "s" : ""
                            }`
                          : "Comment"}
                      </span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {commentsOpen[post.id] && (
                    <div className="comm-comments-section">
                      <div className="comm-comments-list">
                        {(
                          commentsMap[`${post.parentEmail}__${post.id}`] || []
                        ).map((comment) => (
                          <div className="comm-comment-item" key={comment.id}>
                            <div className="comm-comment-avatar">
                              {(
                                comment.authorName ||
                                comment.authorEmail ||
                                "U"
                              )
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((s) => s[0]?.toUpperCase())
                                .join("")}
                            </div>
                            <div className="comm-comment-content">
                              <div className="comm-comment-header">
                                <span className="comm-comment-author">
                                  {comment.authorName}
                                </span>
                                <span className="comm-comment-time">
                                  {fmtTime(comment.createdAt)}
                                </span>
                              </div>
                              <p className="comm-comment-text">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Comment Input */}
                      <div className="comm-comment-composer">
                        <input
                          type="text"
                          value={newComment[post.id] || ""}
                          onChange={(e) =>
                            setNewComment((s) => ({
                              ...s,
                              [post.id]: e.target.value,
                            }))
                          }
                          placeholder="Write a supportive comment..."
                          className="comm-comment-input"
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              submitComment(post.parentEmail, post.id);
                            }
                          }}
                        />
                        <button
                          onClick={() =>
                            submitComment(post.parentEmail, post.id)
                          }
                          disabled={
                            !me.email || !(newComment[post.id] || "").trim()
                          }
                          className="comm-comment-send-btn"
                          title="Send comment (Enter)"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;