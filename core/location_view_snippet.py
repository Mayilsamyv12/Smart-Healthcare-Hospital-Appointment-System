def set_location(request):
    if request.method == 'POST':
        location = request.POST.get('location')
        request.session['user_location'] = location
        messages.success(request, f"Location set to {location}")
    return redirect(request.META.get('HTTP_REFERER', 'home'))
