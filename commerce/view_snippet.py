@login_required
def book_lab_test(request, lab_id):
    lab_test = get_object_or_404(LabTest, id=lab_id)
    if request.method == 'POST':
        date = request.POST.get('date')
        time = request.POST.get('time')
        LabAppointment.objects.create(user=request.user, lab_test=lab_test, date=date, time=time)
        messages.success(request, 'Lab Test booked successfully!')
        return redirect('reminder_list')
    return render(request, 'commerce/book_lab_test.html', {'lab_test': lab_test})
