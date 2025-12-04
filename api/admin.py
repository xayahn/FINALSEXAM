from django.contrib import admin
from .models import Course, Lesson, Project, Submission, Quiz, Question, Choice, Enrollment, Announcement, Notification, Comment

class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4

class QuestionAdmin(admin.ModelAdmin):
    inlines = [ChoiceInline]

admin.site.register(Course)
admin.site.register(Lesson)
admin.site.register(Project)
admin.site.register(Submission)
admin.site.register(Quiz)
admin.site.register(Question, QuestionAdmin)
admin.site.register(Choice)
admin.site.register(Enrollment)
admin.site.register(Announcement)
admin.site.register(Notification)
admin.site.register(Comment)