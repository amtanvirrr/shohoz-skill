import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import Layout from "@/components/layout/Layout";
import AdminLayout from "@/components/admin/AdminLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import RouteTransition from "@/components/RouteTransition";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import FloatingMenuFab from "@/components/layout/FloatingMenuFab";
import { useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";

// Lazy-loaded routes to reduce initial JS bundle size
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Refund = lazy(() => import("./pages/Refund"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const BooksPage = lazy(() => import("./pages/BooksPage"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const BookDetail = lazy(() => import("./pages/BookDetail"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const EbookReader = lazy(() => import("./pages/EbookReader"));
const EnrolledCourse = lazy(() => import("./pages/EnrolledCourse"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBooks = lazy(() => import("./pages/admin/AdminBooks"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminCourseDetail = lazy(() => import("./pages/admin/AdminCourseDetail"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminQuizzes = lazy(() => import("./pages/admin/AdminQuizzes"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminNewsletter = lazy(() => import("./pages/admin/AdminNewsletter"));
const AdminComments = lazy(() => import("./pages/admin/AdminComments"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminShipping = lazy(() => import("./pages/admin/AdminShipping"));
const AdminHero = lazy(() => import("./pages/admin/AdminHero"));
const AdminLandingPages = lazy(() => import("./pages/admin/AdminLandingPages"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogDetailPage = lazy(() => import("./pages/BlogDetailPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentResult = lazy(() => import("./pages/PaymentResult"));

const queryClient = new QueryClient();

const GlobalMobileNav = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin") || pathname.startsWith("/lp/")) return null;
  return (
    <>
      <MobileBottomNav />
      <FloatingMenuFab />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <MetaPixelProvider>
          <ScrollToTop />
          <RouteTransition>
          <Suspense fallback={null}>
          <Routes>
            {/* Public routes with Layout */}
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/courses" element={<Layout><CoursesPage /></Layout>} />
            <Route path="/books" element={<Layout><BooksPage /></Layout>} />
            <Route path="/course/:slug" element={<Layout><CourseDetail /></Layout>} />
            <Route path="/book/:slug" element={<Layout><BookDetail /></Layout>} />
            <Route path="/quizzes" element={<Layout><QuizPage /></Layout>} />
            <Route path="/about" element={<Layout><About /></Layout>} />
            <Route path="/terms" element={<Layout><Terms /></Layout>} />
            <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
            <Route path="/refund" element={<Layout><Refund /></Layout>} />
            <Route path="/blog" element={<Layout><BlogPage /></Layout>} />
            <Route path="/blog/:slug" element={<Layout><BlogDetailPage /></Layout>} />
            <Route path="/contact" element={<Layout><Contact /></Layout>} />
            <Route path="/track-order" element={<Layout><TrackOrderPage /></Layout>} />
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/register" element={<Layout><Register /></Layout>} />
            <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
            <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><UserDashboard /></Layout></ProtectedRoute>} />
            <Route path="/read/:bookId" element={<ProtectedRoute><EbookReader /></ProtectedRoute>} />
            <Route path="/enrolled/:id" element={<ProtectedRoute><Layout><EnrolledCourse /></Layout></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/books" element={<ProtectedRoute adminOnly><AdminLayout><AdminBooks /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute adminOnly><AdminLayout><AdminCourses /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/courses/:id" element={<ProtectedRoute adminOnly><AdminLayout><AdminCourseDetail /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute adminOnly><AdminLayout><AdminOrders /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/quizzes" element={<ProtectedRoute adminOnly><AdminLayout><AdminQuizzes /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/reviews" element={<ProtectedRoute adminOnly><AdminLayout><AdminReviews /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/blog" element={<ProtectedRoute adminOnly><AdminLayout><AdminBlog /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/comments" element={<ProtectedRoute adminOnly><AdminLayout><AdminComments /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/newsletter" element={<ProtectedRoute adminOnly><AdminLayout><AdminNewsletter /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute adminOnly><AdminLayout><AdminPayments /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/shipping" element={<ProtectedRoute adminOnly><AdminLayout><AdminShipping /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/hero" element={<ProtectedRoute adminOnly><AdminLayout><AdminHero /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/landing-pages" element={<ProtectedRoute adminOnly><AdminLayout><AdminLandingPages /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/coupons" element={<ProtectedRoute adminOnly><AdminLayout><AdminCoupons /></AdminLayout></ProtectedRoute>} />

            {/* Landing pages - no layout wrapper */}
            <Route path="/lp/:slug" element={<LandingPage />} />

            {/* Payment gateway result */}
            <Route path="/payment/:status" element={<Layout><PaymentResult /></Layout>} />

            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
          </Suspense>
          </RouteTransition>
          <GlobalMobileNav />
          </MetaPixelProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
