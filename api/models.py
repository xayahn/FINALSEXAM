from django.db import models
from django.contrib.auth.models import User

# 1. COURSE
class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True) # Now Optional
    instructor_name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

# 2. LESSON
class Lesson(models.Model):
    course = models.ForeignKey(Course, related_name='lessons', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content_text = models.TextField(blank=True, null=True) # Now Optional
    video_url = models.URLField(blank=True, null=True)
    order = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.course.title} - {self.title}"

# 3. PROJECT
class Project(models.Model):
    course = models.ForeignKey(Course, related_name='projects', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    instructions = models.TextField(blank=True, null=True) # Now Optional
    deadline = models.DateField(blank=True, null=True)     # Now Optional
    points = models.IntegerField(default=100)

    def __str__(self):
        return self.title

# 4. SUBMISSION
class Submission(models.Model):
    project = models.ForeignKey(Project, related_name='submissions', on_delete=models.CASCADE)
    student_name = models.CharField(max_length=100)
    github_link = models.URLField(blank=True, null=True)
    submitted_file = models.FileField(upload_to='submissions/', blank=True, null=True)
    comments = models.TextField(blank=True)
    
    grade = models.IntegerField(null=True, blank=True)
    feedback = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student_name} - {self.project.title}"

# 5. QUIZ
class Quiz(models.Model):
    course = models.ForeignKey(Course, related_name='quizzes', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.title

# 6. QUESTION
class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    text = models.CharField(max_length=500)

    def __str__(self):
        return self.text

# 7. CHOICE
class Choice(models.Model):
    question = models.ForeignKey(Question, related_name='choices', on_delete=models.CASCADE)
    text = models.CharField(max_length=200)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text

# 8. ENROLLMENT
class Enrollment(models.Model):
    student = models.ForeignKey(User, related_name='enrollments', on_delete=models.CASCADE)
    course = models.ForeignKey(Course, related_name='enrollments', on_delete=models.CASCADE)
    completed_lessons = models.ManyToManyField(Lesson, blank=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course')

    @property
    def progress_percent(self):
        total = self.course.lessons.count()
        if total == 0: return 0
        completed = self.completed_lessons.count()
        return int((completed / total) * 100)

# 9. NOTIFICATION
class Notification(models.Model):
    user = models.ForeignKey(User, related_name='notifications', on_delete=models.CASCADE)
    title = models.CharField(max_length=100)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

# 10. ANNOUNCEMENT
class Announcement(models.Model):
    course = models.ForeignKey(Course, related_name='announcements', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField()
    posted_at = models.DateTimeField(auto_now_add=True)

# 11. COMMENT
class Comment(models.Model):
    user = models.ForeignKey(User, related_name='comments', on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, related_name='comments', on_delete=models.CASCADE, null=True, blank=True)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

# 12. DEVICE (for push notifications)
class Device(models.Model):
    DEVICE_TYPES = (
        ('expo', 'Expo'),
        ('fcm', 'FCM'),
        ('apns', 'APNS'),
    )
    user = models.ForeignKey(User, related_name='devices', on_delete=models.CASCADE, null=True, blank=True)
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES, default='expo')
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.device_type} - {self.token}"

# 13. LESSON ATTACHMENT - files attached to lessons
class LessonAttachment(models.Model):
    lesson = models.ForeignKey(Lesson, related_name='attachments', on_delete=models.CASCADE)
    display_name = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to='lesson_files/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name or self.file.name