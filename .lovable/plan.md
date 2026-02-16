

# অ্যাডমিন প্যানেল রিলোড সমস্যা ফিক্স

## সমস্যা

অ্যাডমিন প্যানেলে রিলোড দিলে হোম পেজে চলে যায়। কারণ:

1. `getSession()` সেশন পাওয়ার পর `checkAdmin()` কল হয় কিন্তু **await করা হয় না**
2. তাই `setLoading(false)` আগেই চলে যায়, যখন `isAdmin` এখনো `false`
3. `ProtectedRoute` দেখে `loading=false`, `isAdmin=false` -- তাই হোমে রিডাইরেক্ট করে

## সমাধান

`src/hooks/useAuth.tsx` ফাইলে নিচের পরিবর্তনগুলো করা হবে:

1. `checkAdmin` ফাংশনকে সরাসরি `setIsAdmin` রিটার্ন করার বদলে **await** করা হবে
2. `getSession` ব্লকে `checkAdmin` কে **await** করে তারপর `setLoading(false)` সেট করা হবে
3. `onAuthStateChange` লিসেনারে `checkAdmin` কে `setTimeout` এর মধ্যে রাখা হবে (deadlock এড়াতে)
4. একটি `isMounted` ফ্ল্যাগ যোগ করা হবে cleanup এর জন্য

## টেকনিক্যাল ডিটেইলস

**পরিবর্তিত ফাইল:** `src/hooks/useAuth.tsx`

```typescript
useEffect(() => {
  let isMounted = true;

  const checkAdminRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (isMounted) setIsAdmin(!!data);
    } catch {
      if (isMounted) setIsAdmin(false);
    }
  };

  // Ongoing auth changes - does NOT control loading
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => checkAdminRole(session.user.id), 0);
      } else {
        setIsAdmin(false);
      }
    }
  );

  // Initial load - controls loading, awaits admin check
  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkAdminRole(session.user.id);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  initializeAuth();

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
```

মূল পার্থক্য: `checkAdminRole` **await** করার পরেই `setLoading(false)` হবে, তাই `isAdmin` সঠিক ভ্যালু পাবে রিডাইরেক্ট চেকের আগে।

