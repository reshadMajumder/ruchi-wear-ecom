from django.db import models


class PolicyTerms(models.Model):
	policy_html = models.TextField(blank=True, default="")
	terms_html = models.TextField(blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		verbose_name = "Policy & Terms"
		verbose_name_plural = "Policy & Terms"

	def save(self, *args, **kwargs):
		# Enforce singleton row at PK=1.
		self.pk = 1
		super().save(*args, **kwargs)

	def __str__(self):
		return "Policy & Terms"


class FAQ(models.Model):
	question = models.CharField(max_length=500)
	answer = models.TextField()
	is_active = models.BooleanField(default=True, db_index=True)
	position = models.PositiveIntegerField(default=0, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["position", "id"]
		indexes = [
			models.Index(fields=["is_active", "position"], name="faq_active_position_idx"),
		]

	def __str__(self):
		return self.question


