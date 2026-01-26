def search_view(request):
    query = request.GET.get('q')
    hospitals = []
    doctors = []
    labs = []
    
    if query:
        from commerce.models import LabTest
        hospitals = Hospital.objects.filter(models.Q(name__icontains=query) | models.Q(location__icontains=query))
        doctors = Doctor.objects.filter(models.Q(name__icontains=query) | models.Q(specialty__icontains=query))
        labs = LabTest.objects.filter(models.Q(name__icontains=query) | models.Q(features__icontains=query))
        
    return render(request, 'core/search_results.html', {
        'query': query,
        'hospitals': hospitals,
        'doctors': doctors,
        'labs': labs
    })
