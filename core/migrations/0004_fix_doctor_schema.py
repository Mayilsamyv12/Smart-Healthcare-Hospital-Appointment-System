from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_specialty_remove_hospital_specialties_and_more'),
    ]

    operations = [
        # migrations.RemoveField(
        #     model_name='hospital',
        #     name='specialties',
        # ),
        # migrations.RunSQL(
        #     "ALTER TABLE core_doctor DROP COLUMN specialty_id;",
        #     reverse_sql=""
        # ),
        migrations.AddField(
            model_name='doctor',
            name='specialty',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='doctors', to='core.specialty'),
        ),
        migrations.AddField(
            model_name='hospital',
            name='specialties',
            field=models.ManyToManyField(blank=True, related_name='hospitals', to='core.specialty'),
        ),
    ]
