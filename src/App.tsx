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
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import CoursesPage from "./pages/CoursesPage";
import BooksPage from "./pages/BooksPage";
import CourseDetail from "./pages/CourseDetail";
import BookDetail from "./pages/BookDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import QuizPage from "./pages/QuizPage";
import UserDashboard from "./pages/UserDashboard";
import EbookReader from "./pages/EbookReader";
import EnrolledCourse from "./pages/EnrolledCourse";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBooks from "./pages/admin/AdminBooks";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminCourseDetail from "./pages/admin/AdminCourseDetail";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminQuizzes from "./pages/admin/AdminQuizzes";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminNewsletter from "./pages/admin/AdminNewsletter";
import AdminComments from "./pages/admin/AdminComments";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminShipping from "./pages/admin/AdminShipping";
import AdminHero from "./pages/admin/AdminHero";
import AdminLandingPages from "./pages/admin/AdminLandingPages";
import AdminCoupons from "./pages/admin/AdminCoupons";
import BlogPage from "./pages/BlogPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import LandingPage from "./pages/LandingPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import NotFound from "./pages/NotFound";
import PaymentResult from "./pages/PaymentResult";

const queryClient = new QueryClient();

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
          </RouteTransition>
          </MetaPixelProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
