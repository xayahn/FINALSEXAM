from rest_framework import viewsets, generics, status, decorators
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .models import Course, Lesson, Project, Submission, Quiz, Question, Choice, Enrollment, Announcement, Notification, Comment, Device, LessonAttachment
from .serializers import *
from .serializers import DeviceSerializer, LessonAttachmentSerializer

# --- AUTH ---
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        user = User.objects.get(username=response.data.get('username'))
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"message": "Account created", "user": UserSerializer(user).data, "token": token.key})

class LoginView(APIView):
    def post(self, request):
        user = authenticate(username=request.data.get('username'), password=request.data.get('password'))
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({"message": "Login Successful", "user": UserSerializer(user).data, "token": token.key})
        return Response({"error": "Invalid Credentials"}, status=status.HTTP_400_BAD_REQUEST)

# --- VIEWSETS ---
class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer

    @decorators.action(detail=False, methods=['post'])
    def mark_complete(self, request):
        try:
            enrollment = Enrollment.objects.get(student_id=request.data.get('student'), course_id=request.data.get('course'))
            enrollment.completed_lessons.add(request.data.get('lesson'))
            enrollment.save()
            return Response({'status': 'marked complete', 'progress': enrollment.progress_percent})
        except Enrollment.DoesNotExist:
            return Response({'error': 'Enrollment not found'}, status=404)

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    @decorators.action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        try:
            notif = self.get_object()
            notif.is_read = True
            notif.save()
            return Response({'status': 'marked read'})
        except Exception:
            return Response({'error': 'Could not mark as read'}, status=400)


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer

class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        # If user is authenticated, attach
        if request.user and request.user.is_authenticated:
            data['user'] = request.user.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LessonAttachmentViewSet(viewsets.ModelViewSet):
    queryset = LessonAttachment.objects.all()
    serializer_class = LessonAttachmentSerializer

    def create(self, request, *args, **kwargs):
        # Accept file uploads via multipart/form-data
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# Standard ViewSets
class LessonViewSet(viewsets.ModelViewSet): queryset = Lesson.objects.all(); serializer_class = LessonSerializer
class ProjectViewSet(viewsets.ModelViewSet): queryset = Project.objects.all(); serializer_class = ProjectSerializer
class SubmissionViewSet(viewsets.ModelViewSet): queryset = Submission.objects.all(); serializer_class = SubmissionSerializer
class QuizViewSet(viewsets.ModelViewSet): queryset = Quiz.objects.all(); serializer_class = QuizSerializer
class QuestionViewSet(viewsets.ModelViewSet): queryset = Question.objects.all(); serializer_class = QuestionSerializer
class ChoiceViewSet(viewsets.ModelViewSet): queryset = Choice.objects.all(); serializer_class = ChoiceSerializer
class AnnouncementViewSet(viewsets.ModelViewSet): queryset = Announcement.objects.all(); serializer_class = AnnouncementSerializer