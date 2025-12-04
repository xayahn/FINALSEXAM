from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet, LessonViewSet, ProjectViewSet, SubmissionViewSet,
    QuizViewSet, QuestionViewSet, ChoiceViewSet, EnrollmentViewSet,
    AnnouncementViewSet, NotificationViewSet, CommentViewSet,
    DeviceViewSet, LessonAttachmentViewSet,
    RegisterView, LoginView,
)

router = DefaultRouter()
router.register(r'courses', CourseViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'projects', ProjectViewSet)
router.register(r'submissions', SubmissionViewSet)
router.register(r'quizzes', QuizViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'choices', ChoiceViewSet)
router.register(r'enrollments', EnrollmentViewSet)
router.register(r'announcements', AnnouncementViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'devices', DeviceViewSet)
router.register(r'lesson-attachments', LessonAttachmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
]
