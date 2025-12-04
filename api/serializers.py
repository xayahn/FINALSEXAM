from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Course, Lesson, Project, Submission, Quiz, Question, Choice, Enrollment, Announcement, Notification, Comment
from .models import Device, LessonAttachment

# --- AUTH ---
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    teacher_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name', 'teacher_code']

    def create(self, validated_data):
        code = validated_data.pop('teacher_code', '')
        user = User.objects.create_user(**validated_data)
        if code == "TEACHER2025":
            user.is_staff = True
            user.save()
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff']

# --- FEATURES ---
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ['id', 'user', 'device_type', 'token', 'created_at']


class LessonAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonAttachment
        fields = ['id', 'lesson', 'display_name', 'file', 'uploaded_at']

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = '__all__'

class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.ReadOnlyField(source='course.title')
    progress = serializers.ReadOnlyField(source='progress_percent')
    
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course', 'course_title', 'progress', 'enrolled_at']

# --- CONTENT ---
class CommentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    class Meta: model = Comment; fields = ['id', 'user', 'username', 'lesson', 'text', 'created_at']

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta: model = Choice; fields = ['id', 'text', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)
    class Meta: model = Question; fields = ['id', 'text', 'choices']

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    class Meta: model = Quiz; fields = ['id', 'title', 'description', 'questions']

class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'

class LessonSerializer(serializers.ModelSerializer):
    comments = CommentSerializer(many=True, read_only=True)
    attachments = LessonAttachmentSerializer(many=True, read_only=True)
    class Meta:
        model = Lesson
        fields = '__all__'

class CourseSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    projects = ProjectSerializer(many=True, read_only=True)
    quizzes = QuizSerializer(many=True, read_only=True)
    announcements = AnnouncementSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = '__all__'