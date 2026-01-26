
def about(request):
    return render(request, 'core/about.html')

def terms(request):
    return render(request, 'core/terms.html')

def privacy(request):
    return render(request, 'core/privacy.html')

def contact(request):
    return render(request, 'core/contact.html')

def help_page(request):
    return render(request, 'core/help.html')
