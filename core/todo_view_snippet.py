@login_required
def reminder_list(request):
    appointments = Appointment.objects.filter(user=request.user).order_by('date', 'time')
    return render(request, 'core/reminder_list.html', {'appointments': appointments})
