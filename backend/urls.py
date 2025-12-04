from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from api.views import *

def home(request):
    return HttpResponse("<h1>EduForge Backend is Running! 🚀</h1><p>Go to <a href='/admin/'>/admin/</a> to log in.</p>")

urlpatterns = [
    # This handles the root url ""
    path('', home),
    
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

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
    path('admin/', admin.site.urls),
    path('api/register/', RegisterView.as_view()),
    path('api/login/', LoginView.as_view()),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

    